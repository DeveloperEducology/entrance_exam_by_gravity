/**
 * apiClient.js
 * Drop-in replacement for the Supabase client.
 * Mirrors the Supabase fluent chained query interface:
 *   api.from('table').select('*').eq('id', x).single()
 *   api.from('table').insert([obj])
 *   api.from('table').update(obj).eq('id', x)
 *   api.from('table').delete().eq('id', x)
 *   api.from('table').delete().in('id', ids)
 *   api.from('table').upsert(data, { onConflict: 'id' })
 */

let BASE_URL = 'http://localhost:5000/api';
try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
        BASE_URL = import.meta.env.VITE_API_URL;
    } else if (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) {
        BASE_URL = process.env.VITE_API_URL;
    }
} catch (e) {
    // Use default
}

// ─── Query Builder ─────────────────────────────────────────────────────────────
class QueryBuilder {
    constructor(table) {
        this._table = table;
        this._method = 'GET';
        this._body = null;
        this._filters = {};   // { field: { op, value } }
        this._sortField = null;
        this._sortAsc = true;
        this._limitVal = null;
        this._single = false;
        this._upsert = false;
    }

    // ── Query modifiers ──────────────────────────────────────────────────────────
    select(cols) {
        // We always fetch all fields; cols only for compatibility
        this._method = 'GET';
        return this;
    }

    eq(field, value) {
        this._filters[field] = value;
        return this;
    }

    in(field, values) {
        this._filters[`${field}__in`] = values.join(',');
        return this;
    }

    order(field, { ascending = true } = {}) {
        this._sortField = field;
        this._sortAsc = ascending;
        return this;
    }

    limit(n) {
        this._limitVal = n;
        return this;
    }

    single() {
        this._single = true;
        return this;
    }

    // ── Mutations ────────────────────────────────────────────────────────────────
    insert(data) {
        this._method = 'POST';
        this._body = Array.isArray(data) ? data : [data];
        this._upsert = false;
        return this;
    }

    upsert(data, _opts) {
        this._method = 'POST_UPSERT';
        this._body = Array.isArray(data) ? data : [data];
        return this;
    }

    update(data) {
        this._method = 'PUT';
        this._body = data;
        return this;
    }

    delete() {
        this._method = 'DELETE';
        return this;
    }

    // ── Execute (thenable) ───────────────────────────────────────────────────────
    then(resolve, reject) {
        return this._execute().then(resolve, reject);
    }

    catch(fn) {
        return this._execute().catch(fn);
    }

    async _execute() {
        const url = new URL(`${BASE_URL}/${this._table}`);

        try {
            let response;

            if (this._method === 'GET') {
                // Apply filters as query params
                for (const [key, val] of Object.entries(this._filters)) {
                    url.searchParams.set(key, val);
                }
                if (this._sortField) {
                    url.searchParams.set('order', this._sortField);
                    url.searchParams.set('ascending', String(this._sortAsc));
                }
                if (this._limitVal) {
                    url.searchParams.set('limit', String(this._limitVal));
                }
                response = await fetch(url.toString());

            } else if (this._method === 'POST') {
                response = await fetch(url.toString(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this._body),
                });

            } else if (this._method === 'POST_UPSERT') {
                response = await fetch(`${url.toString()}/upsert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this._body),
                });

            } else if (this._method === 'PUT') {
                // Find the id filter
                const idValue = this._filters['id'] || this._filters['_id'];
                if (!idValue) throw new Error('update() requires .eq("id", value)');
                const patchUrl = `${BASE_URL}/${this._table}/${idValue}`;
                response = await fetch(patchUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this._body),
                });

            } else if (this._method === 'DELETE') {
                const idValue = this._filters['id'] || this._filters['_id'];

                if (idValue) {
                    // Single delete
                    response = await fetch(`${BASE_URL}/${this._table}/${idValue}`, {
                        method: 'DELETE',
                    });
                } else if (this._filters['id__in']) {
                    // Bulk delete
                    response = await fetch(url.toString(), {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: this._filters['id__in'].split(',') }),
                    });
                } else {
                    throw new Error('delete() requires .eq("id", value) or .in("id", values)');
                }
            }

            const json = await response.json();

            if (!response.ok) {
                return { data: null, error: json.error || { message: 'Request failed' } };
            }

            // Normalize response
            let data = json.data;

            if (this._single && Array.isArray(data)) {
                data = data[0] || null;
            }

            return { data, error: null };
        } catch (err) {
            return { data: null, error: { message: err.message } };
        }
    }
}

// ─── Main API object (mimics supabase client interface) ────────────────────────
export const api = {
    from: (table) => new QueryBuilder(table),
};

// ─── Named export matching supabase export name so pages can optionally alias ──
export const supabase = api;
