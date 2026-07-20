export const onRequestGet = async (context) => {
  try {
    const kv = context.env.TA3AFI_DATA;
    
    // Helper to get week number
    const getWeekNumber = (d) => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    };

    const getStatsForPersona = async (persona) => {
      const now = new Date();
      
      // 1. Last 24 Hours
      const hourly = [];
      for (let i = 0; i < 24; i++) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const YYYY = d.getFullYear();
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const DD = String(d.getDate()).padStart(2, '0');
        const HH = String(d.getHours()).padStart(2, '0');
        const key = `stats_hour_${YYYY}${MM}${DD}_${HH}_${persona}`;
        hourly.push({ key, label: `${HH}:00` });
      }

      // 2. Last 7 Days
      const daily = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const YYYY = d.getFullYear();
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const DD = String(d.getDate()).padStart(2, '0');
        const key = `stats_day_${YYYY}${MM}${DD}_${persona}`;
        const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        daily.push({ key, label: dayNames[d.getDay()] });
      }

      // 3. Last 4 Weeks
      const weekly = [];
      for (let i = 0; i < 4; i++) {
        const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const YYYY = d.getFullYear();
        const WW = String(getWeekNumber(d)).padStart(2, '0');
        const key = `stats_week_${YYYY}_W${WW}_${persona}`;
        weekly.push({ key, label: `أسبوع ${WW}` });
      }

      // 4. Last 12 Months
      const monthly = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const YYYY = d.getFullYear();
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const key = `stats_month_${YYYY}${MM}_${persona}`;
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        monthly.push({ key, label: monthNames[d.getMonth()] });
      }

      // Fetch all values from KV
      const fetchValues = async (items) => {
        return Promise.all(items.map(async (item) => {
          const val = await kv.get(item.key);
          return {
            label: item.label,
            count: val ? parseInt(val, 10) : 0
          };
        }));
      };

      const [hourlyData, dailyData, weeklyData, monthlyData] = await Promise.all([
        fetchValues(hourly),
        fetchValues(daily),
        fetchValues(weekly),
        fetchValues(monthly)
      ]);

      return {
        hourly: hourlyData.reverse(),
        daily: dailyData.reverse(),
        weekly: weeklyData.reverse(),
        monthly: monthlyData.reverse()
      };
    };

    // 5. Fetch Country Stats
    const countryListResult = await kv.list({ prefix: 'stats_country_' });
    const countryKeys = countryListResult.keys || [];

    const countryNames = {
      'IQ': 'العراق',
      'TR': 'تركيا',
      'DE': 'ألمانيا',
      'SE': 'السويد',
      'GB': 'المملكة المتحدة',
      'US': 'الولايات المتحدة',
      'NL': 'هولندا',
      'FI': 'فنلندا',
      'DK': 'الدنمارك',
      'NO': 'النرويج',
      'CA': 'كندا',
      'AU': 'أستراليا',
      'JO': 'الأردن',
      'SY': 'سوريا',
      'LB': 'لبنان',
      'SA': 'السعودية',
      'AE': 'الإمارات',
      'KW': 'الكويت',
      'QA': 'قطر',
      'BH': 'البحرين',
      'OM': 'عمان',
      'EG': 'مصر',
    };

    const countriesData = await Promise.all(countryKeys.map(async (key) => {
      const code = key.name.replace('stats_country_', '').toUpperCase();
      const val = await kv.get(key.name);
      return {
        code,
        name: countryNames[code] || code,
        count: val ? parseInt(val, 10) : 0
      };
    }));

    countriesData.sort((a, b) => b.count - a.count);

    const [doctor, rafiq] = await Promise.all([
      getStatsForPersona('doctor'),
      getStatsForPersona('rafiq')
    ]);

    return new Response(JSON.stringify({ doctor, rafiq, countries: countriesData }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};
