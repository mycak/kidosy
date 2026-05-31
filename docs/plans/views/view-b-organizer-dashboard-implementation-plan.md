# View B: Dashboard Organizatora (`/organizer/*`) — Plan Implementacji

## 1. Cel i zakres

Ten plan obejmuje **pełny obszar organizatora**:

- `/organizer/dashboard` — dashboard z KPI i szybkimi akcjami
- `/organizer/offers` — lista ofert organizatora (filtry/sortowanie/akcje)
- `/organizer/offers/new` — 4-krokowy wizard tworzenia oferty
- `/organizer/offers/:offerId/edit` — edycja istniejącej oferty
- `/organizer/leads` — lista zgłoszeń rodziców (leads)
- `/organizer/profile` — dane organizatora i ustawienia konta

Zakres jest zgodny z:

- `docs/prd.md` (US-015 do US-028)
- `docs/plans/ui-plan.md` (sekcja B1–B6)
- `docs/plans/db-plan.md` (tabele: `organizer_profiles`, `offers`, `offer_images`, `offer_schedules`, `leads`)

---

## 2. Stan obecny (analiza luki)

### 2.1 Co już jest

- Istnieje trasa: `src/routes/organizer/dashboard.tsx`
- Trasa sprawdza sesję Supabase i przekierowuje niezalogowanych na `PATHS.AUTH.LOGIN`
- Widok jest placeholderem: `OrganizerDashboardPlaceholderPage`

### 2.2 Czego brakuje

- Brak pozostałych tras `/organizer/*`
- Brak wspólnego layoutu organizatora (header/sidebar/breadcrumbs)
- Brak pełnej warstwy danych (queries/mutations) dla wszystkich widoków organizer
- Brak pełnych komponentów UI i logiki CRUD/wizarda
- Brak testów E2E i testów komponentowych dla organizer flow

---

## 3. Wymagania funkcjonalne (mapowanie na US)

### 3.1 Obowiązkowe na MVP

- US-019, US-020, US-021, US-022 — CRUD ofert + podgląd
- US-023, US-024 — archiwizacja i zarządzanie miejscami
- US-025 — obsługa zgłoszeń (widoczność i status)
- US-026, US-027 — filtrowanie i sortowanie ofert
- US-028 — widoczność statusu publikacji (i potwierdzeń po stronie systemu)
- US-018 — edycja profilu organizatora

### 3.2 Wymagania przekrojowe

- Utrzymanie sesji i ochrona tras organizer-only
- WCAG AA dla formularzy i tabel
- Obsługa stanów: loading / empty / error
- Spójność z TanStack Router + TanStack Query + Zustand

---

## 4. Docelowa architektura frontendu

## 4.1 Struktura routingowa

Rekomendowana struktura:

```text
src/routes/
	organizer/
		route.tsx                   # guard + layout organizera
		dashboard.tsx
		offers/
			index.tsx                 # /organizer/offers
			new.tsx                   # /organizer/offers/new
			$offerId.edit.tsx         # /organizer/offers/:offerId/edit
		leads.tsx                   # /organizer/leads
		profile.tsx                 # /organizer/profile
```

`route.tsx` dla sekcji organizer powinien:

- sprawdzać sesję użytkownika,
- weryfikować rolę organizera,
- zapewniać wspólny layout oraz ochronę wszystkich podtras.

## 4.2 Struktura feature

```text
src/features/organizer/
	components/
		layout/
			OrganizerLayout.tsx
			OrganizerSidebar.tsx
			OrganizerTopbar.tsx
		dashboard/
			OrganizerDashboardPage.tsx
			OrganizerStatsCards.tsx
			OrganizerQuickActions.tsx
		offers/
			OrganizerOffersPage.tsx
			OrganizerOffersTable.tsx
			OfferActionsMenu.tsx
			OfferWizard/
				OfferWizardPage.tsx
				OfferStepBasic.tsx
				OfferStepLocationAndSchedule.tsx
				OfferStepCapacityAndContact.tsx
				OfferStepImagesAndSummary.tsx
		leads/
			OrganizerLeadsPage.tsx
			OrganizerLeadsTable.tsx
			LeadStatusSelect.tsx
		profile/
			OrganizerProfilePage.tsx
			OrganizerProfileForm.tsx
	queries/
		organizer-dashboard.queries.ts
		organizer-offers.queries.ts
		organizer-leads.queries.ts
		organizer-profile.queries.ts
	stores/
		organizer-offer-wizard.store.ts
	schemas/
		organizer-offer.schema.ts
		organizer-profile.schema.ts
		organizer-leads.schema.ts
	types/
		organizer.types.ts
```

---

## 5. Kontrakt danych i endpointy (integracja)

Plan zakłada spięcie widoków organizera z istniejącymi planami endpointów.

| Widok                             | Endpointy (docelowo)                                 | Powiązane plany                                                                           |
| --------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/organizer/dashboard`            | `GET /my-offers` + agregacje statusów/leads          | `my-offers-implementation-plan.md`                                                        |
| `/organizer/offers`               | `GET /my-offers`, `DELETE /offers/:id`               | `my-offers-implementation-plan.md`, `delete-offer-implementation-plan.md`                 |
| `/organizer/offers/new`           | `POST /offers`, słowniki                             | `create-implementation-plan.md`, `dictionaries-*-implementation-plan.md`                  |
| `/organizer/offers/:offerId/edit` | `PATCH /offers/:id`, upload/remove image             | `update-implementation-plan.md`, `delete-image-implementation-plan.md`                    |
| `/organizer/leads`                | `GET /organizer/leads`, `PATCH /organizer/leads/:id` | `organizer-leads-implementation-plan.md`, `organizer-leads-update-implementation-plan.md` |
| `/organizer/profile`              | `GET /auth/profile`, `PATCH /auth/profile`           | `auth-profile-get-implementation-plan.md`, `auth-profile-update-implementation-plan.md`   |

Uwagi:

- Query keys i DTO muszą być wspólne i reużywalne pomiędzy dashboardem i listą ofert.
- Akcje destrukcyjne (`delete`, `archive`) wymagają `ConfirmDialog`.

---

## 6. Plan implementacji (fazy)

## Faza 0 — Fundamenty i guardy (1 dzień)

- [ ] Dodać `src/routes/organizer/route.tsx` jako parent route z guardem organizer-only
- [ ] Wydzielić `OrganizerLayout` (topbar + sidebar + content + breadcrumbs)
- [ ] Ujednolicić redirecty dla braku sesji i braku roli
- [ ] Dodać wspólne stany: loading/error boundary dla sekcji organizer

**Kryterium zakończenia:** każda trasa organizer dziedziczy layout i ochronę dostępu.

## Faza 1 — Dashboard (`/organizer/dashboard`) (1 dzień)

- [ ] Zastąpić placeholder `OrganizerDashboardPlaceholderPage`
- [ ] Zbudować karty KPI (draft/pending/published/archived + leads)
- [ ] Dodać "quick actions" (Dodaj ofertę, Przejdź do zgłoszeń, Przejdź do profilu)
- [ ] Dodać sekcję "ostatnio zmienione oferty"

**Kryterium zakończenia:** dashboard daje pełny overview i nawigację do głównych zadań.

## Faza 2 — Lista ofert (`/organizer/offers`) (2 dni)

- [ ] Wdrożyć tabelę/listę ofert organizatora
- [ ] Filtry statusów: all/published/pending/draft/rejected/archived
- [ ] Sortowanie: `updated_at`, `created_at`, `title`, `start_date`
- [ ] Akcje: edytuj, usuń, podgląd, archiwizuj
- [ ] Empty state + paginacja

**Kryterium zakończenia:** organizator zarządza pełną listą swoich ofert bez przeładowań i z poprawnymi filtrami.

## Faza 3 — Wizard tworzenia (`/organizer/offers/new`) (3 dni)

- [ ] Krok 1: podstawowe dane (tytuł, opis, kategorie, typ)
- [ ] Krok 2: lokalizacja + termin + harmonogram
- [ ] Krok 3: miejsca + kontakt
- [ ] Krok 4: zdjęcia + podsumowanie + submit/save draft
- [ ] Walidacje Zod per-krok + walidacja końcowa
- [ ] Mechanizm "zapisz szkic" i ostrzeżenie przy opuszczeniu widoku

**Kryterium zakończenia:** nowa oferta może zostać zapisana jako szkic albo wysłana do moderacji.

## Faza 4 — Edycja oferty (`/organizer/offers/:offerId/edit`) (2 dni)

- [ ] Reużyć wizard w trybie edit (prefill danych)
- [ ] Obsłużyć aktualizację zdjęć i kolejności
- [ ] Obsłużyć reguły statusu po edycji (np. ponowne pending review)
- [ ] Pokazać komunikat o wpływie zmian na publikację

**Kryterium zakończenia:** edycja działa dla każdej oferty organizatora i respektuje workflow moderacji.

## Faza 5 — Leads (`/organizer/leads`) (1.5 dnia)

- [ ] Lista zgłoszeń z paginacją, filtrem statusu i wyszukiwaniem
- [ ] Sortowanie po dacie/statusie/ofercie
- [ ] Panel szczegółów zgłoszenia
- [ ] Zmiana statusu zgłoszenia (`new` → `contacted` → `completed`)

**Kryterium zakończenia:** organizator ma kompletny widok leadów i może nimi zarządzać.

## Faza 6 — Profil (`/organizer/profile`) (1 dzień)

- [ ] Formularz edycji `company_name`, `phone`, `email_public`
- [ ] Pobieranie bieżącego profilu i optimistic update
- [ ] Komunikaty sukces/błąd
- [ ] Obsługa oczekiwania na weryfikację przy zmianie e-mail (jeśli backend zwraca taki status)

**Kryterium zakończenia:** organizator aktualizuje dane i widzi jednoznaczny wynik operacji.

## Faza 7 — QA, dostępność, dopracowanie (1.5 dnia)

- [ ] Responsywność (desktop/tablet/mobile)
- [ ] Klawiatura i focus management
- [ ] Spójne teksty PL dla błędów i empty states
- [ ] Weryfikacja telemetry (eventy z kluczowych akcji organizera)

**Kryterium zakończenia:** organizer area przechodzi checklistę UX/WCAG i smoke test manualny.

---

## 7. Testy

## 7.1 Unit

- Schematy walidacji Zod (offer/profile/leads)
- Mappery DTO → ViewModel
- Helpery sortowania i filtrowania

## 7.2 Component / Integration (RTL + Vitest)

- `OrganizerOffersTable` (filtry, sortowanie, empty state)
- `OfferWizardPage` (nawigacja po krokach, walidacja, submit)
- `OrganizerLeadsTable` (zmiana statusu, fallbacki)
- `OrganizerProfileForm` (dirty state, submit, obsługa błędu)

## 7.3 E2E (Playwright)

- Login organizatora → dashboard
- Dodanie oferty jako draft
- Edycja oferty i wysyłka do moderacji
- Przegląd i aktualizacja statusu leada
- Aktualizacja profilu

---

## 8. Bezpieczeństwo i uprawnienia

- Wszystkie trasy organizer muszą wymagać sesji i roli organizer
- Dane muszą być izolowane RLS (organizator widzi tylko własne zasoby)
- Brak dostępu anon do endpointów organizer
- Akcje destrukcyjne potwierdzane dialogiem
- Brak logiki biznesowej wyłącznie po stronie klienta (frontend tylko orkiestruje)

---

## 9. Ryzyka i mitigacje

1. **Niespójność statusów oferty** (frontend vs backend)

- Mitigacja: wspólne typy statusów + kontrakt testowy endpointów

2. **Złożoność wizarda**

- Mitigacja: reużywalny store kroku i walidacja per-step, nie jedna walidacja globalna

3. **Wydajność list przy większych wolumenach**

- Mitigacja: paginacja serwerowa, ograniczenie payloadu, indeksy zgodnie z planami endpointów

4. **Regresje w auth guardach**

- Mitigacja: testy E2E dla scenariuszy unauthorized i organizer-only

---

## 10. Definition of Done (cały obszar organizer)

- [ ] Wszystkie trasy `/organizer/*` istnieją i działają w jednym layoutcie
- [ ] Brak placeholderów w organizer area
- [ ] CRUD ofert + wizard + profile + leads działają end-to-end
- [ ] Obsłużone stany loading/empty/error
- [ ] Testy unit + component + E2E dla ścieżek krytycznych przechodzą
- [ ] Dostępność (WCAG AA) zweryfikowana dla głównych formularzy i tabel
- [ ] Brak naruszeń izolacji danych pomiędzy organizerami

---

## 11. Sugerowana kolejność wdrożenia (praktyczna)

1. Guard + layout organizer
2. Dashboard + lista ofert (największa wartość operacyjna)
3. Wizard new/edit
4. Leads
5. Profile
6. QA i testy E2E

To podejście minimalizuje ryzyko i szybko odblokowuje realną pracę organizatora w MVP.
