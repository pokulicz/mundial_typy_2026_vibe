# Mundial Typy 2026 ⚽

Prywatna liga typowania dokładnych wyników meczów Mistrzostw Świata FIFA 2026.
Gracze typują wyniki, walczą o pulę punktów, a ranking aktualizuje się po każdym rozliczonym meczu.

## Jak to działa (logika punktacji)

- Liczy się **tylko dokładny wynik** (np. typ 2:1 i wynik 2:1 = trafienie).
- Każdy mecz to pula po **5 pkt** od każdego typującego.
- Jeśli **nikt** nie trafi dokładnego wyniku — nikt nie zyskuje ani nie traci.
- Jeśli ktoś trafi — **przegrani tracą po 5 pkt**, a **trafiacze dzielą pulę przegranych**:
  `wygrana = ((liczba_typujących − liczba_trafień) × 5) / liczba_trafień`
- W puli meczu biorą udział tylko gracze, którzy oddali typ na ten mecz.

## Role

- **Administrator** — dodaje graczy, importuje terminarz, wpisuje wyniki, rozlicza mecze, zarządza rankingiem.
- **Gracz** — typuje wyniki (do gwizdka), widzi swój typ, ranking i historię; typy innych dopiero po starcie meczu.

## Logowanie

- **Nazwa użytkownika + PIN** (4–6 cyfr). Konta zakłada administrator.
- Sesja zapamiętywana na 60 dni (nie trzeba logować się za każdym razem).
- Domyślne konto admina przy pierwszym uruchomieniu: **login `admin`, PIN `2026`** (zmień po zalogowaniu!).

## Bezpieczeństwo (egzekwowane po stronie serwera)

- Po rozpoczęciu meczu typowanie jest blokowane także w bazie/serwerze (nie tylko w UI).
- Gracz nie zobaczy cudzych typów przed startem meczu.
- Gracz nie wejdzie do panelu administratora.
- Rozliczenie jest **idempotentne** — wielokrotne kliknięcie „Rozlicz” nie tworzy duplikatów; zmiana wyniku i ponowne rozliczenie poprawnie przelicza punkty.

## Architektura

```
webapp/    — React + Vite + Tailwind + shadcn/ui (frontend, PWA)
backend/   — Hono + Bun + Prisma (SQLite) (API + logika + baza)
```

### Backend (`backend/src`)
- `auth.ts` — logowanie username+PIN (bcrypt), sesje cookie, role.
- `helpers.ts` — blokada typowania (`isLocked`) + logika punktacji (`computeSettlement`).
- `routes/` — `auth`, `users`, `matches`, `predictions`, `settle`, `ranking`.
- `data/worldcup2026.ts` — pełny terminarz MŚ 2026 (104 mecze) do importu.
- `bootstrap.ts` — tworzy konto admina przy pustej bazie.

### Baza danych (Prisma / SQLite)
`User`, `Session`, `Match`, `Prediction`, `PointEntry` (rozliczenia), `AppSetting`.

### Frontend (`webapp/src`)
- `pages/` — `Login`, `Matches`, `MatchDetail`, `Ranking`, `MyBets`, `admin/*`.
- `lib/` — `auth`, `queries` (React Query), `types`, `format`, `api`.
- PWA: `public/manifest.webmanifest` + `public/sw.js` + ikony (dodawanie do ekranu głównego).

## Terminarz Mundialu 2026

Administrator importuje pełny terminarz jednym kliknięciem (panel → Mecze → „Importuj terminarz”):
faza grupowa (12 grup × 6 meczów) + drabinka pucharowa (1/16 → finał) = **104 mecze**.
Drużyny i terminy to edytowalna baza startowa — każdy mecz można poprawić w panelu, a wyniki
knockoutów uzupełnić, gdy będą znane. Możliwy też import własny z **CSV/JSON**.

## Co dalej (gotowe pod rozbudowę)

Wiele turniejów, wiele grup znajomych, statystyki, powiadomienia, automatyczne pobieranie wyników z API,
eksport do Excela/PDF, własna domena.
