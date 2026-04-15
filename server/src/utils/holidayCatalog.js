const { format } = require("date-fns");

const HOLIDAY_CATALOG = {
  US: [
    { key: "new_years_day", name: "New Year's Day", date: "2026-01-01" },
    { key: "martin_luther_king_jr_day", name: "Martin Luther King, Jr. Day", date: "2026-01-19" },
    { key: "presidents_day", name: "Presidents' Day", date: "2026-02-16" },
    { key: "memorial_day", name: "Memorial Day", date: "2026-05-25" },
    { key: "juneteenth", name: "Juneteenth", date: "2026-06-19" },
    { key: "independence_day", name: "Independence Day", date: "2026-07-03" },
    { key: "labor_day", name: "Labor Day", date: "2026-09-07" },
    { key: "columbus_day", name: "Columbus Day", date: "2026-10-12" },
    { key: "veterans_day", name: "Veterans Day", date: "2026-11-11" },
    { key: "thanksgiving", name: "Thanksgiving Day", date: "2026-11-26" },
    { key: "christmas_day", name: "Christmas Day", date: "2026-12-25" },
    { key: "new_years_day", name: "New Year's Day", date: "2027-01-01" },
    { key: "martin_luther_king_jr_day", name: "Martin Luther King, Jr. Day", date: "2027-01-18" },
    { key: "presidents_day", name: "Presidents' Day", date: "2027-02-15" },
    { key: "memorial_day", name: "Memorial Day", date: "2027-05-31" },
    { key: "juneteenth", name: "Juneteenth", date: "2027-06-18" },
    { key: "independence_day", name: "Independence Day", date: "2027-07-05" },
    { key: "labor_day", name: "Labor Day", date: "2027-09-06" },
    { key: "columbus_day", name: "Columbus Day", date: "2027-10-11" },
    { key: "veterans_day", name: "Veterans Day", date: "2027-11-11" },
    { key: "thanksgiving", name: "Thanksgiving Day", date: "2027-11-25" },
    { key: "christmas_day", name: "Christmas Day", date: "2027-12-24" },
  ],
};

function formatHolidayOption(item) {
  return {
    key: item.key,
    label: item.name,
    nextDateLabel: format(new Date(`${item.date}T00:00:00`), "d MMM yyyy"),
    date: item.date,
  };
}

function getHolidayOptions(region, now = new Date()) {
  if (!region || region === "NONE") {
    return [];
  }

  const items = HOLIDAY_CATALOG[region] || [];
  const todayKey = now.toISOString().slice(0, 10);
  const nextByKey = new Map();

  for (const item of items) {
    if (item.date < todayKey) {
      continue;
    }

    if (!nextByKey.has(item.key)) {
      nextByKey.set(item.key, item);
    }
  }

  return Array.from(nextByKey.values()).map(formatHolidayOption);
}

function getBlockedHolidayDateKeys(region, enabledHolidayKeys = []) {
  if (!region || region === "NONE" || enabledHolidayKeys.length === 0) {
    return new Set();
  }

  const enabledSet = new Set(enabledHolidayKeys);
  const blocked = new Set();

  for (const item of HOLIDAY_CATALOG[region] || []) {
    if (enabledSet.has(item.key)) {
      blocked.add(item.date);
    }
  }

  return blocked;
}

module.exports = {
  getBlockedHolidayDateKeys,
  getHolidayOptions,
};
