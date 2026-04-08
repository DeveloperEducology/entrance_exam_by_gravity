import dns from 'dns';
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'gfbyqabgrxfzwdbailyy.supabase.co') {
    if (options.all) {
      return callback(null, [{ address: '104.18.38.10', family: 4 }]);
    }
    return callback(null, '104.18.38.10', 4);
  }
  return originalLookup(hostname, options, callback);
};

import('./test-db.js');
