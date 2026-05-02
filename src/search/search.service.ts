import { Injectable } from '@nestjs/common';

type SearchTermStat = {
  count: number;
  lastSearchedAt: number;
};

@Injectable()
export class SearchService {
  private readonly terms = new Map<string, SearchTermStat>();

  track(termRaw: string) {
    const term = this.normalize(termRaw);
    if (!term) return { tracked: false };

    const now = Date.now();
    const prev = this.terms.get(term);
    if (prev) {
      this.terms.set(term, {
        count: prev.count + 1,
        lastSearchedAt: now,
      });
    } else {
      this.terms.set(term, { count: 1, lastSearchedAt: now });
    }
    return { tracked: true, term };
  }

  getPopular(limit = 10) {
    const now = Date.now();
    const rows = [...this.terms.entries()].map(([term, s]) => {
      const ageHours = Math.max(0, (now - s.lastSearchedAt) / (1000 * 60 * 60));
      const recencyBoost = Math.max(0, 72 - ageHours) / 72; // 0..1 in last 72h
      const score = s.count * 10 + recencyBoost * 5;
      return {
        term,
        count: s.count,
        lastSearchedAt: new Date(s.lastSearchedAt).toISOString(),
        score: Math.round(score * 100) / 100,
      };
    });

    rows.sort((a, b) => b.score - a.score || b.count - a.count);
    return rows.slice(0, Math.max(1, Math.min(limit, 50)));
  }

  private normalize(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}

