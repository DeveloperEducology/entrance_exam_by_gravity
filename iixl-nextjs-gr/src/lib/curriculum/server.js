import 'server-only';
import { cache } from 'react';

import { createServerClient } from '@/lib/supabase/server';
import { backendUrl } from '@/lib/backend/url';
import { serverError, serverLog } from '@/lib/debug/logger';
import {
  grades as fallbackGrades,
  subjects as fallbackSubjects,
  units as fallbackUnits,
  microskills as fallbackMicroskills,
} from '@/data/curriculum';

const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];
const TABLES = {
  grades: ['grades'],
  subjects: ['subjects'],
  units: ['units'],
  microskills: ['micro_skills', 'microskills'],
};
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_COLUMN_CACHE = new Map();
const SUPABASE_OUTAGE_COOLDOWN_MS = 60 * 1000;
let supabaseOutageUntil = 0;

function isNetworkFetchFailure(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('fetch failed') || message.includes('failed to fetch') || message.includes('timed out');
}

function isSupabaseOutageOpen() {
  return Date.now() < supabaseOutageUntil;
}

function openSupabaseOutageWindow() {
  supabaseOutageUntil = Date.now() + SUPABASE_OUTAGE_COOLDOWN_MS;
}

export function getCurriculumOutageStatus() {
  const open = isSupabaseOutageOpen();
  return {
    open,
    retryAfterMs: open ? Math.max(0, supabaseOutageUntil - Date.now()) : 0,
  };
}

async function fetchRows(
  supabase,
  tableCandidates,
  {
    select = '*',
    filters = [],
    orderColumns = ORDER_COLUMNS,
  } = {}
) {
  if (!supabase) {
    serverLog('curriculum.fetchRows', 'supabase client missing; using fallback data', { tableCandidates });
    return null;
  }
  if (isSupabaseOutageOpen()) {
    serverLog('curriculum.fetchRows', 'supabase outage window open; skipping remote fetch and using fallback', {
      tableCandidates,
      retryAfterMs: supabaseOutageUntil - Date.now(),
    });
    return null;
  }

  for (const table of tableCandidates) {
    const cachedOrderColumn = ORDER_COLUMN_CACHE.get(table);
    if (cachedOrderColumn) {
      let cachedQuery = supabase.from(table).select(select);
      for (const filter of filters) {
        cachedQuery = cachedQuery.eq(filter.column, filter.value);
      }
      const { data, error } = await cachedQuery.order(cachedOrderColumn, { ascending: true });
      if (!error) return data ?? [];
      if (isNetworkFetchFailure(error)) {
        openSupabaseOutageWindow();
        serverError('curriculum.fetchRows', 'cached-order query hit network failure; opening outage window', error, {
          table,
          cachedOrderColumn,
        });
        return null;
      }
      ORDER_COLUMN_CACHE.delete(table);
    }

    for (const orderColumn of orderColumns) {
      let query = supabase.from(table).select(select);
      for (const filter of filters) {
        query = query.eq(filter.column, filter.value);
      }

      const { data, error } = await query.order(orderColumn, { ascending: true });
      if (!error) {
        ORDER_COLUMN_CACHE.set(table, orderColumn);
        return data ?? [];
      }
      if (isNetworkFetchFailure(error)) {
        openSupabaseOutageWindow();
        serverError('curriculum.fetchRows', 'ordered query hit network failure; opening outage window', error, {
          table,
          orderColumn,
        });
        return null;
      }
      serverLog('curriculum.fetchRows', 'order column failed, trying next candidate', {
        table,
        orderColumn,
        error: error?.message || 'unknown_error',
      });
    }

    let fallbackQuery = supabase.from(table).select(select);
    for (const filter of filters) {
      fallbackQuery = fallbackQuery.eq(filter.column, filter.value);
    }

    const { data: unorderedData, error: unorderedError } = await fallbackQuery;
    if (!unorderedError) return unorderedData ?? [];
    if (isNetworkFetchFailure(unorderedError)) {
      openSupabaseOutageWindow();
      serverError('curriculum.fetchRows', 'unordered query hit network failure; opening outage window', unorderedError, {
        table,
      });
      return null;
    }
    serverError('curriculum.fetchRows', 'fallback unordered query failed', unorderedError, { table });
  }

  serverLog('curriculum.fetchRows', 'all table candidates failed; will use in-memory fallback', { tableCandidates });
  return null;
}

function sortByOrder(list) {
  return [...(list || [])].sort((a, b) => {
    const aOrder = Number(a?.sort_order ?? a?.idx ?? 0);
    const bOrder = Number(b?.sort_order ?? b?.idx ?? 0);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

const getAllCurriculumRows = cache(async function getAllCurriculumRows() {
  const startedAt = Date.now();

  let gradesRows = null, subjectsRows = null, unitsRows = null, microskillsRows = null;

  try {
    const { connectMongo } = require('@/lib/db/mongo');
    const mongoose = require('mongoose');

    await connectMongo();
    const db = mongoose.connection.db;

    const filterCondition = { type: { $exists: false }, parts: { $exists: false } };
    const [grades, subjects, units, microskills, oldMicroskills] = await Promise.all([
      db.collection("grades").find(filterCondition).toArray(),
      db.collection("subjects").find(filterCondition).toArray(),
      db.collection("units").find(filterCondition).toArray(),
      db.collection("microskills").find(filterCondition).toArray(),
      db.collection("micro_skills").find(filterCondition).toArray(),
    ]);

    const normalizeId = (item) => {
      if (!item) return item;
      if (item._id && !item.id) item.id = String(item._id);
      return item;
    };

    gradesRows = grades.map(normalizeId);
    subjectsRows = subjects.map(normalizeId);
    unitsRows = units.map(normalizeId);

    const mergedMicroskills = [];
    const seenIds = new Set();
    for (const item of [...microskills, ...oldMicroskills]) {
      const norm = normalizeId(item);
      const strId = String(norm.id);
      if (!seenIds.has(strId)) {
        seenIds.add(strId);
        mergedMicroskills.push(norm);
      }
    }
    microskillsRows = mergedMicroskills;

  } catch (err) {
    serverLog('curriculum.getAllCurriculumRows', 'MongoDB backend curriculum fetch failed', { message: err?.message });
  }

  const result = {
    grades: gradesRows ?? fallbackGrades,
    subjects: subjectsRows ?? fallbackSubjects,
    units: unitsRows ?? fallbackUnits,
    microskills: microskillsRows ?? fallbackMicroskills,
  };

  serverLog('curriculum.getAllCurriculumRows', 'curriculum data resolved', {
    durationMs: Date.now() - startedAt,
    source: {
      grades: gradesRows ? 'mongodb' : 'fallback',
      subjects: subjectsRows ? 'mongodb' : 'fallback',
      units: unitsRows ? 'mongodb' : 'fallback',
      microskills: microskillsRows ? 'mongodb' : 'fallback',
    },
    counts: {
      grades: result.grades.length,
      subjects: result.subjects.length,
      units: result.units.length,
      microskills: result.microskills.length,
    },
  });

  return result;
});

function toSkillSlugBase(name, id) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base) return base;
  return `skill-${String(id || '').slice(0, 8) || 'item'}`;
}

function withMicroskillSlugs(microskills) {
  const ordered = sortByOrder(microskills);
  const counts = new Map();

  return ordered.map((skill) => {
    const base = toSkillSlugBase(skill.name, skill.id);
    const nextCount = (counts.get(base) || 0) + 1;
    counts.set(base, nextCount);
    const slug = nextCount === 1 ? base : `${base}-${nextCount}`;
    return { ...skill, slug };
  });
}

const getCurriculumWithSlugs = cache(async function getCurriculumWithSlugs() {
  const { grades, subjects, units, microskills } = await getAllCurriculumRows();
  const microskillsWithSlugs = withMicroskillSlugs(microskills);

  const microskillById = new Map(
    microskillsWithSlugs.map((skill) => [String(skill.id), skill])
  );
  const microskillBySlug = new Map(
    microskillsWithSlugs.map((skill) => [String(skill.slug), skill])
  );

  return {
    grades,
    subjects,
    units,
    microskills: microskillsWithSlugs,
    microskillById,
    microskillBySlug,
  };
});

export async function getHomeGradesData() {
  const { grades, subjects, units, microskills } = await getCurriculumWithSlugs();

  const skillsPerUnit = microskills.reduce((acc, skill) => {
    const unitId = skill.unit_id;
    acc[unitId] = (acc[unitId] || 0) + 1;
    return acc;
  }, {});

  const unitsBySubject = units.reduce((acc, unit) => {
    const subjectId = unit.subject_id;
    if (!acc[subjectId]) acc[subjectId] = [];
    acc[subjectId].push(unit);
    return acc;
  }, {});

  const subjectsByGrade = subjects.reduce((acc, subject) => {
    const gradeId = subject.grade_id;
    const subjectUnits = unitsBySubject[subject.id] || [];
    const skillCount = subjectUnits.reduce((sum, unit) => sum + (skillsPerUnit[unit.id] || 0), 0);

    if (!acc[gradeId]) acc[gradeId] = [];
    acc[gradeId].push({
      ...subject,
      skillCount,
    });
    return acc;
  }, {});

  // Only show grades that are marked as is_active: true (defaults to true if undefined)
  const activeGrades = grades.filter((g) => g.is_active !== false);

  return sortByOrder(activeGrades).map((grade) => ({
    ...grade,
    subjects: sortByOrder(subjectsByGrade[grade.id] || []),
  }));
}

export async function getSkillsPageData(gradeId, subjectSlug) {
  const { grades, subjects, units, microskills } = await getCurriculumWithSlugs();

  const grade = grades.find((g) => String(g.id) === String(gradeId)) || null;
  const gradeSubjects = sortByOrder(subjects.filter((s) => String(s.grade_id) === String(gradeId)));
  const currentSubject = gradeSubjects.find((s) => s.slug === subjectSlug) || null;

  if (!grade || !currentSubject) {
    return { grade: null, subjects: [], currentSubject: null, units: [] };
  }

  const currentUnits = sortByOrder(
    units.filter((u) => String(u.subject_id) === String(currentSubject.id))
  );

  const microskillsByUnitId = microskills.reduce((acc, skill) => {
    const unitId = String(skill.unit_id);
    if (!acc[unitId]) acc[unitId] = [];
    acc[unitId].push(skill);
    return acc;
  }, {});

  const unitsWithMicroskills = currentUnits.map((unit) => ({
    ...unit,
    microskills: sortByOrder(microskillsByUnitId[String(unit.id)] || []),
  }));

  return {
    grade,
    subjects: gradeSubjects,
    currentSubject,
    units: unitsWithMicroskills,
  };
}

export async function getMicroskillContextById(microskillId) {
  return getMicroskillContextByKey(microskillId);
}

export async function getMicroskillContextByKey(microskillKey) {
  const { grades, subjects, units, microskillById, microskillBySlug } = await getCurriculumWithSlugs();
  const key = String(microskillKey ?? '').trim();

  const microskill = microskillById.get(key) || microskillBySlug.get(key) || null;
  if (!microskill) return { grade: null, subject: null, unit: null, microskill: null };

  const unit = units.find((u) => String(u.id) === String(microskill.unit_id)) || null;
  const subject = unit
    ? subjects.find((s) => String(s.id) === String(unit.subject_id)) || null
    : null;
  const grade = subject
    ? grades.find((g) => String(g.id) === String(subject.grade_id)) || null
    : null;

  return { grade, subject, unit, microskill };
}

export async function resolveMicroskillIdByKey(microskillKey) {
  const key = String(microskillKey ?? '').trim();
  if (!key) return null;
  if (UUID_REGEX.test(key)) return key;

  const { microskillBySlug } = await getCurriculumWithSlugs();
  const match = microskillBySlug.get(key);
  return match ? String(match.id) : null;
}
