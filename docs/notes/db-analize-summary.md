<conversation_summary> <decisions> 1. Kategorie ofert będą przechowywane w relacji many-to-many poprzez tabelę pośredniczącą `offer_categories`, aby umożliwić przypisanie wielu kategorii do jednej oferty. 2. Typy ofert (zajęcia cykliczne, kolonie, półkolonie, obozy) będą przechowywane w tabeli słownika `offer_types` dla łatwości rozszerzenia. 3. Przedziały wiekowe będą przechowywane jako tablica liczb całkowitych `ages number[]` w tabeli `offers`, aby umożliwić sytuacje gdzie zajęcia są dostępne dla niedoległych lat (np. 7 i 9 latków). 4. Harmonogramy zajęć cyklicznych będą zarządzane poprzez tabelę `offer_schedules` z datami, czasami rozpoczęcia/zakończenia. 5. Lokalizacje będą przechowywane jako typ geograficzny PostgreSQL `geometry(Point, 4326)` wraz z adresem tekstowym, z indeksem spatial (GIST/BRIN) dla efektywnych zapytań geolokalizacyjnych. 6. Dane osobowe rodziców z formularz zgłoszenia będą przechowywane w bazie z szyfrowaniem i RLS, umożliwiając organizatorom widok zgłoszeń tylko do swoich ofert. 7. Statusy ofert będą śledzone poprzez kolumnę `status` w tabeli `offers` oraz tabelę `offer_status_history` do pełnego audytu zmian statusu. 8. Potencjalne duplikaty ofert będą flagowane w tabeli `offer_duplicates` do przeglądu przez administratora, bez automatycznego usuwania. 9. Audit logs dla moderacji nie będą implementowane na etapie MVP - skupiamy się na podstawowym śledzeniu zmian statusu. 10. Row Level Security (RLS) będzie skonfigurowany dla trzech ról: rodzic (dostęp do opublikowanych ofert), organizator (zarządzanie własnymi ofertami i zgłoszeniami), admin (pełny dostęp). 11. Zdjęcia ofert będą przechowywane w Supabase Storage z przechowywaniem ścieżek w tabeli `offer_images`. 12. Liczba dostępnych miejsc będzie przechowywana jako bieżąca wartość INT w tabeli `offers` z opcjonalną tabelą `offer_spot_history` dla przyszłej analityki. 13. Usunięcie konta organizatora będzie realizowane poprzez soft delete (`deleted_at`), oferujący zachowanie integralności danych. 14. Dane organizatora (firma, telefon, email publiczny) będą przechowywane w osobnej tabeli `organizer_profiles` powiązanej 1:1 z tabelą `users`. 15. Zgłoszenia (leads) będą powiązane z `offer_id` oraz będą zawierać `offer_snapshot` (JSON) z danymi oferty w momencie zgłoszenia. 16. Historia wysłanych e-maili będzie śledzowana w tabeli `email_logs` dla celów debugowania i future retry logic. 17. Filtry użytkownika będą przechowywane w localStorage przeglądarki dla MVP, bez przechowywania w bazie. 18. Zarządzanie tokenami resetowania hasła i weryfikacji e-maila będzie obsługiwane natywnie przez Supabase Auth. 19. Metadane przeglądania ofert będą śledzone jedynie w Google Analytics 4 bez dodatkowego przechowywania w bazie. 20. Powody odrzucenia ofert będą przechowywane w kolumnach `rejection_reason` i `moderated_by` bezpośrednio w tabeli `offers`. </decisions> <matched_recommendations> 1. **Many-to-many relacja dla kategorii** — Tablica pośrednicząca `offer_categories` umożliwia ofercie posiadanie wielu kategorii, co wspiera wymagania filtrowania. 2. **Tabela słownika dla typów ofert** — `offer_types` pozwala na rozszerzenie bez zmian schematu. 3. **Array type dla lat** — `ages integer[]` zapewnia elastyczność dla przypadków z discontinuous age ranges. 4. **Separate schedules table** — `offer_schedules` obsługuje różne rodzaje powtórzeń zajęć cyklicznych. 5. **Geographic data types** — `geometry(Point, 4326)` z spatial indexami umożliwia wydajne queries poszukujące ofert w promieniu. 6. **Przechowywanie i szyfrowanie danych rodziców** — Wspiera wymagania bezpieczeństwa i moderacji zgłoszeń. 7. **Status history tracking** — Pełny audyt zmian statusu oferty dla admin panel. 8. **Duplicate flagging system** — Umożliwia administratorowi przegląd bez automatyzacji. 9. **RLS policies** — Rola-based access control dla trzech ról użytkowników zgodnie z wymaganiami. 10. **Supabase Storage dla zdjęć** — Optymalizacja rozmiaru bazy i CDN delivery. 11. **Soft deletes** — Zachowanie integralności historycznych danych. 12. **Organizer profiles separation** — Przygotowanie do przyszłych rozszerzeń (NIP, certyfikaty). 13. **Offer snapshots w leads** — Zachowanie kontekstu zgłoszenia niezależnie od zmian oferty. 14. **Email logs** — Wspiera debugging i przyszłe retry mechanizmy. </matched_recommendations> <database_planning_summary>

Podsumowanie Planowania Bazy Danych MVP
Główne Wymagania Schematu
Na podstawie wymagań produktu (PRD) oraz decyzji podjętych w dyskusji, schemat bazy danych musi wspierać:

Zarządzanie ofertami: Dodawanie, edycję, usuwanie i moderację ofert zajęć dla dzieci
Wyszukiwanie i filtrowanie: Filtrowanie po kategorii, wieku, typie oferty i lokalizacji z mapą interaktywną
Zgłoszenia (leads): Przyjmowanie zgłoszeń od rodziców do ofert
Autentykacja: Rejestracja i logowanie organizatorów, reset hasła
Moderacja: Zatwierdzanie/odrzucanie ofert przez administratora
Bezpieczeństwo: RLS dla trzech ról (rodzic anonimowy, organizator, admin)
Kluczowe Encje i Relacje
Encje Główne:
users — Konta użytkowników (organizatorzy + adminowie)

id, email, password_hash, email_verified_at, created_at, deleted_at
Rola przechowywana w Supabase Auth JWT claims
organizer_profiles (1:1 z users) — Dane firmy organizatora

user_id, company_name, phone, email_public, created_at
offers — Główna tabela ofert

id, user_id (organizator), title, description, ages (integer[]), address, location (geometry), start_date, end_date, available_spots, status, rejection_reason, moderated_by, created_at, updated_at, deleted_at
offer_types (słownik) — Typy ofert (zajęcia cykliczne, kolonie, etc.)

id, name, slug
offer_categories (słownik) — Kategorie (sport, artystyczne, edukacyjne)

id, name, slug
offer_offer_categories (many-to-many) — Powiązanie ofert z kategoriami

offer_id, category_id
offer_schedules — Harmonogramy zajęć cyklicznych

id, offer_id, day_of_week, start_time, end_time, is_active
offer_images — Zdjęcia ofert w Supabase Storage

id, offer_id, storage_path, display_order, created_at
offer_status_history — Historia zmian statusu oferty

id, offer_id, old_status, new_status, changed_by, changed_at
offer_duplicates — Flagowanie potencjalnych duplikatów

id, offer_id_1, offer_id_2, similarity_score, status (pending/reviewed/dismissed), reviewed_by, reviewed_at
leads — Zgłoszenia rodziców

id, offer_id, child_name, child_age, parent_name, parent_email (szyfrowany), parent_phone (szyfrowany), message, offer_snapshot (JSON), status, created_at
email_logs — Historia wysłanych e-maili

id, recipient_email, email_type, lead_id, offer_id, sent_at, status (pending/sent/failed)
Relacje:
offers → users (wiele ofert na organizatora)
offers → offer_types (każda oferta ma jeden typ)
offers → offer_categories (many-to-many)
offers → offer_schedules (jedna do wielu)
offers → offer_images (jedna do wielu)
offers → offer_status_history (jedna do wielu)
leads → offers (wiele zgłoszeń na ofertę)
organizer_profiles → users (1:1)
Aspekty Bezpieczeństwa i Skalowalności
Row Level Security (RLS):
Rodzice (anonimowi): Widok SELECT na ofertach z status = 'published' i deleted_at IS NULL
Organizatorzy: Widok i edycja (UPDATE, DELETE, INSERT) tylko własnych ofert, widok zgłoszeń do swoich ofert
Adminowie: Pełny dostęp do wszystkich danych, dostęp do panelu moderacji
Szyfrowanie:
Dane wrażliwe rodziców (email, telefon) szyfrowane na poziomie aplikacji przed przechowywaniem w leads
Soft Deletes:
Kolumny deleted_at w users i offers zapewniają możliwość przywrócenia i audytu bez utraty danych historycznych
Optymalizacja Wydajności
Indeksy:
Spatial index na kolumnie location (GIST lub BRIN) dla efektywnych geospatial queries
B-tree index na user_id, status, created_at w tabeli offers
B-tree index na offer_id w tabelach offer_schedules, offer_images, leads, offer_status_history
Full-text search index na title i description (pg_trgm extension dla fuzzy matching duplikatów)
Cached/Materialized Views (przyszłość):
Opcjonalnie na post-MVP: offers_published_count_by_category dla szybkiego liczenia ofert w UI
Przechowywanie Danych
Zdjęcia: Supabase Storage (zmniejsza rozmiar bazy, umożliwia CDN)
Snapshots ofert w leads: JSON w kolumnie offer_snapshot — zachowuje kontekst zgłoszenia
Filtry użytkownika: localStorage przeglądarki (brak przechowywania w bazie na MVP)
Tracking: Google Analytics 4 dla analityki (bez dodatkowego przechowywania w bazie)
Workflow Publikacji Ofert
Organizator dodaje ofertę → status = 'draft'
Organizator wysyła do moderacji → status = 'pending_review'
Admin zatwierdza/odrzuca → status = 'published' lub status = 'rejected' z rejection_reason
Po upływie end_date → status = 'archived' (auto-job lub trigger)
Zarządzanie Sesjami i Tokenami
Natywny Supabase Auth do tokenów resetowania hasła i weryfikacji e-maila
JWT claims do przechowywania roli użytkownika
Timeout sesji: 30 minut nieaktywności (obsługiwane przez frontend)
</database_planning_summary> <unresolved_issues>

Brak istotnych nierozwiązanych kwestii. Schemat bazy danych został w pełni sfinalizowany na podstawie dyskusji i decyzji użytkownika.

Rekomendacje na następny etap:

Przygotować migracje Supabase/Prisma z pełnym schematem
Zdefiniować RLS policies w Supabase
Skonfigurować encryption dla wrażliwych pól w aplikacji
Wdrożyć spatial indexes oraz full-text search
Przygotować seedowe dane dla testowania (kategorie, typy ofert, sample offers)
</unresolved_issues> </conversation_summary>
