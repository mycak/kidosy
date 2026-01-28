# Schemat Bazy Danych PostgreSQL - Kidosy MVP

## 1. Lista Tabel z Kolumnami, Typami Danych i Ograniczeniami

### 1.1 Tabela `users`

Przechowuje dane użytkowników (organizatorzy i administratorzy). Rola użytkownika jest przechowywana w JWT claims Supabase Auth.
Cała tabela jest obsługiwana przez Supabase Auth.

| Kolumna      | Typ                        | Ograniczenia                           | Opis                               |
| ------------ | -------------------------- | -------------------------------------- | ---------------------------------- |
| `id`         | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator użytkownika |
| `email`      | `text`                     | UNIQUE, NOT NULL                       | Adres e-mail (unikalny)            |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP    | Data utworzenia konta              |
| `deleted_at` | `timestamp with time zone` | NULL                                   | Data usunięcia (soft delete)       |

**Notatki:**

- Hasło i tokeny sesji zarządzane natywnie przez Supabase Auth
- Rola użytkownika (organizator/admin) przechowywana w JWT claims
- Weryfikacja e-maila obsługiwana przez Supabase Auth

---

### 1.2 Tabela `organizer_profiles`

Przechowuje dane profilowe organizatora (dane firmy). Relacja 1:1 z tabelą `users`.

| Kolumna        | Typ                        | Ograniczenia                           | Opis                                                |
| -------------- | -------------------------- | -------------------------------------- | --------------------------------------------------- |
| `id`           | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator                              |
| `user_id`      | `uuid`                     | UNIQUE, NOT NULL, FK → users(id)       | Odniesienie do użytkownika                          |
| `company_name` | `text`                     | NOT NULL                               | Nazwa firmy/osoby                                   |
| `phone`        | `text`                     | NOT NULL                               | Telefon kontaktowy                                  |
| `email_public` | `text`                     | NOT NULL                               | Publiczny e-mail (może się różnić od email w users) |
| `created_at`   | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP    | Data utworzenia profilu                             |
| `updated_at`   | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP    | Data ostatniej aktualizacji                         |

**Notatki:**

- Przygotowana do przyszłych rozszerzeń (NIP, certyfikaty, itp.)
- Dane telefoniczne mogą być szyfrowane na poziomie aplikacji jeśli wymagane

---

### 1.3 Tabela `offer_types` (Słownik)

Przechowuje typy ofert (zajęcia cykliczne, kolonie, półkolonie, obozy).

| Kolumna      | Typ                        | Ograniczenia                           | Opis                                 |
| ------------ | -------------------------- | -------------------------------------- | ------------------------------------ |
| `id`         | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator               |
| `name`       | `text`                     | UNIQUE, NOT NULL                       | Nazwa typu (np. "Zajęcia cykliczne") |
| `slug`       | `text`                     | UNIQUE, NOT NULL                       | URL-friendly identyfikator           |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP    | Data utworzenia                      |

**Domyślne wartości (seed data):**

- Zajęcia cykliczne
- Kolonie letnie
- Półkolonie
- Obozy

---

### 1.4 Tabela `categories` (Słownik)

Przechowuje kategorie zajęć (sport, artystyczne, edukacyjne, inne).

| Kolumna       | Typ                        | Ograniczenia                           | Opis                       |
| ------------- | -------------------------- | -------------------------------------- | -------------------------- |
| `id`          | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator     |
| `name`        | `text`                     | UNIQUE, NOT NULL                       | Nazwa kategorii            |
| `slug`        | `text`                     | UNIQUE, NOT NULL                       | URL-friendly identyfikator |
| `description` | `text`                     | NULL                                   | Opis kategorii             |
| `created_at`  | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP    | Data utworzenia            |

**Domyślne wartości (seed data):**

- Sport
- Artystyczne
- Edukacyjne
- Inne

---

### 1.5 Tabela `offers`

Główna tabela ofert zajęć. Zawiera wszystkie podstawowe informacje o ofercie.

| Kolumna            | Typ                        | Ograniczenia                                                                                                  | Opis                                                            |
| ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `id`               | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid()                                                                        | Unikalny identyfikator oferty                                   |
| `user_id`          | `uuid`                     | NOT NULL, FK → users(id) ON DELETE CASCADE                                                                    | Organizator (właściciel oferty)                                 |
| `offer_type_id`    | `uuid`                     | NOT NULL, FK → offer_types(id)                                                                                | Typ oferty                                                      |
| `title`            | `text`                     | NOT NULL                                                                                                      | Nazwa oferty                                                    |
| `description`      | `text`                     | NOT NULL                                                                                                      | Opis szczegółowy                                                |
| `ages`             | `integer[]`                | NOT NULL                                                                                                      | Tablica lat (np. {3,4,5} lub {7,9} dla nieciągłych przedziałów) |
| `address`          | `text`                     | NOT NULL                                                                                                      | Pełny adres tekstowy                                            |
| `location`         | `geometry(Point, 4326)`    | NOT NULL                                                                                                      | Geograficzne współrzędne (longitude, latitude)                  |
| `start_date`       | `date`                     | NOT NULL                                                                                                      | Data rozpoczęcia                                                |
| `end_date`         | `date`                     | NOT NULL                                                                                                      | Data zakończenia                                                |
| `available_spots`  | `integer`                  | NOT NULL, CHECK (available_spots >= 0)                                                                        | Liczba dostępnych miejsc                                        |
| `status`           | `text`                     | NOT NULL, DEFAULT 'draft', CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')) | Status oferty                                                   |
| `rejection_reason` | `text`                     | NULL                                                                                                          | Powód odrzucenia (wypełniane dla status='rejected')             |
| `moderated_by`     | `uuid`                     | NULL, FK → users(id)                                                                                          | Admin, który moderował ofertę                                   |
| `created_at`       | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP                                                                           | Data utworzenia                                                 |
| `updated_at`       | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP                                                                           | Data ostatniej aktualizacji                                     |
| `deleted_at`       | `timestamp with time zone` | NULL                                                                                                          | Data usunięcia (soft delete)                                    |

**Ograniczenia:**

- `start_date` musi być przed `end_date`
- `available_spots` nie może być ujemne
- Status ograniczony do określonych wartości

---

### 1.6 Tabela `offer_categories` (Many-to-Many)

Łączy oferty z kategoriami (jedna oferta może mieć wiele kategorii).

| Kolumna       | Typ                        | Ograniczenia                                     | Opis                     |
| ------------- | -------------------------- | ------------------------------------------------ | ------------------------ |
| `id`          | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid()           | Unikalny identyfikator   |
| `offer_id`    | `uuid`                     | NOT NULL, FK → offers(id) ON DELETE CASCADE      | Odniesienie do oferty    |
| `category_id` | `uuid`                     | NOT NULL, FK → categories(id) ON DELETE RESTRICT | Odniesienie do kategorii |
| `created_at`  | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP              | Data przypisania         |

**Ograniczenia:**

- Unikatowa kombinacja (`offer_id`, `category_id`) - UNIQUE CONSTRAINT

---

### 1.7 Tabela `offer_schedules`

Przechowuje harmonogramy zajęć cyklicznych (dni tygodnia, godziny).

| Kolumna       | Typ                        | Ograniczenia                                  | Opis                                         |
| ------------- | -------------------------- | --------------------------------------------- | -------------------------------------------- |
| `id`          | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid()        | Unikalny identyfikator                       |
| `offer_id`    | `uuid`                     | NOT NULL, FK → offers(id) ON DELETE CASCADE   | Odniesienie do oferty                        |
| `day_of_week` | `integer`                  | NOT NULL, CHECK (day_of_week BETWEEN 0 AND 6) | Dzień tygodnia (0=poniedziałek, 6=niedziela) |
| `start_time`  | `time without time zone`   | NOT NULL                                      | Godzina rozpoczęcia                          |
| `end_time`    | `time without time zone`   | NOT NULL                                      | Godzina zakończenia                          |
| `is_active`   | `boolean`                  | NOT NULL, DEFAULT true                        | Czy harmonogram jest aktywny                 |
| `created_at`  | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP           | Data utworzenia                              |

**Ograniczenia:**

- `start_time` musi być przed `end_time`

**Notatki:**

- Używane wyłącznie dla ofert typu "zajęcia cykliczne"
- Może zawierać wiele wpisów dla jednej oferty (np. poniedziałek 16:00-17:30 i środa 17:00-18:30)

---

### 1.8 Tabela `offer_images`

Przechowuje referencje do zdjęć ofert (przechowywane w Supabase Storage).

| Kolumna         | Typ                        | Ograniczenia                                | Opis                                     |
| --------------- | -------------------------- | ------------------------------------------- | ---------------------------------------- |
| `id`            | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid()      | Unikalny identyfikator                   |
| `offer_id`      | `uuid`                     | NOT NULL, FK → offers(id) ON DELETE CASCADE | Odniesienie do oferty                    |
| `storage_path`  | `text`                     | NOT NULL                                    | Ścieżka w Supabase Storage (bucket/path) |
| `display_order` | `integer`                  | NOT NULL, DEFAULT 0                         | Kolejność wyświetlania (0 = pierwsze)    |
| `created_at`    | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP         | Data dodania                             |

**Notatki:**

- Przechowuje jedynie referencje do plików w Supabase Storage
- Maksymalnie 10 zdjęć na ofertę (sprawdzane na poziomie aplikacji)
- `storage_path` format: `offers/{offer_id}/{filename}`

---

### 1.9 Tabela `offer_status_history`

Przechowuje historię zmian statusu oferty dla celów audytu.

| Kolumna      | Typ                        | Ograniczenia                                | Opis                         |
| ------------ | -------------------------- | ------------------------------------------- | ---------------------------- |
| `id`         | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid()      | Unikalny identyfikator       |
| `offer_id`   | `uuid`                     | NOT NULL, FK → offers(id) ON DELETE CASCADE | Odniesienie do oferty        |
| `old_status` | `text`                     | NOT NULL                                    | Poprzedni status             |
| `new_status` | `text`                     | NOT NULL                                    | Nowy status                  |
| `changed_by` | `uuid`                     | NOT NULL, FK → users(id)                    | Użytkownik dokonujący zmiany |
| `reason`     | `text`                     | NULL                                        | Powód zmiany (opcjonalnie)   |
| `changed_at` | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP         | Data i czas zmiany           |

**Notatki:**

- Każda zmiana statusu w `offers` powinna być rejestrowana tu poprzez trigger
- Umożliwia pełny audyt ścieżki życia oferty

---

### 1.10 Tabela `offer_duplicates`

Flaguje potencjalne duplikaty ofert do przeglądu przez administratora.

| Kolumna            | Typ                        | Ograniczenia                                                                        | Opis                         |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| `id`               | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid()                                              | Unikalny identyfikator       |
| `offer_id_1`       | `uuid`                     | NOT NULL, FK → offers(id) ON DELETE CASCADE                                         | Pierwsza oferta              |
| `offer_id_2`       | `uuid`                     | NOT NULL, FK → offers(id) ON DELETE CASCADE                                         | Druga oferta                 |
| `similarity_score` | `numeric(3,2)`             | NOT NULL, CHECK (similarity_score BETWEEN 0 AND 1)                                  | Wynik podobieństwa (0.0-1.0) |
| `status`           | `text`                     | NOT NULL, DEFAULT 'pending', CHECK (status IN ('pending', 'reviewed', 'dismissed')) | Status przeglądu             |
| `reviewed_by`      | `uuid`                     | NULL, FK → users(id)                                                                | Admin, który przejrzał       |
| `reviewed_at`      | `timestamp with time zone` | NULL                                                                                | Data przeglądu               |
| `notes`            | `text`                     | NULL                                                                                | Notatki admina               |
| `created_at`       | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP                                                 | Data utworzenia              |

**Ograniczenia:**

- `offer_id_1` ≠ `offer_id_2`
- Unikatowa kombinacja (`offer_id_1`, `offer_id_2`) pamiętając o symetrii

---

### 1.11 Tabela `leads`

Przechowuje zgłoszenia rodziców do ofert.

| Kolumna          | Typ                        | Ograniczenia                                                                                          | Opis                                               |
| ---------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `id`             | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid()                                                                | Unikalny identyfikator                             |
| `offer_id`       | `uuid`                     | NOT NULL, FK → offers(id) ON DELETE CASCADE                                                           | Odniesienie do oferty                              |
| `child_name`     | `text`                     | NOT NULL                                                                                              | Imię dziecka                                       |
| `child_age`      | `integer`                  | NOT NULL, CHECK (child_age > 0)                                                                       | Wiek dziecka                                       |
| `parent_name`    | `text`                     | NOT NULL                                                                                              | Imię rodzica/opiekuna                              |
| `parent_email`   | `text`                     | NOT NULL                                                                                              | E-mail rodzica (szyfrowany na poziomie aplikacji)  |
| `parent_phone`   | `text`                     | NOT NULL                                                                                              | Telefon rodzica (szyfrowany na poziomie aplikacji) |
| `message`        | `text`                     | NULL                                                                                                  | Dodatkowa wiadomość od rodzica                     |
| `offer_snapshot` | `jsonb`                    | NOT NULL                                                                                              | JSON snapshot oferty w momencie zgłoszenia         |
| `status`         | `text`                     | NOT NULL, DEFAULT 'submitted', CHECK (status IN ('submitted', 'contacted', 'completed', 'cancelled')) | Status zgłoszenia                                  |
| `created_at`     | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP                                                                   | Data zgłoszenia                                    |

**Notatki:**

- `parent_email` i `parent_phone` szyfrowane na poziomie aplikacji przed zapisaniem
- `offer_snapshot` zawiera JSON z danymi oferty w momencie zgłoszenia (zabezpieczenie przed zmianami oferty)
- Dostęp do zgłoszeń ograniczony za pomocą RLS (organizator widzi tylko zgłoszenia do swoich ofert)

---

### 1.12 Tabela `email_logs`

Śledzenie wysłanych e-maili dla debugowania i przyszłych retry mechanizmów.

| Kolumna           | Typ                        | Ograniczenia                                                                                                                                                                    | Opis                                             |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `id`              | `uuid`                     | PRIMARY KEY, DEFAULT gen_random_uuid()                                                                                                                                          | Unikalny identyfikator                           |
| `recipient_email` | `text`                     | NOT NULL                                                                                                                                                                        | Adres e-mail odbiorcy                            |
| `email_type`      | `text`                     | NOT NULL, CHECK (email_type IN ('welcome', 'verification', 'offer_published', 'offer_rejected', 'lead_submission_to_organizer', 'lead_submission_to_parent', 'password_reset')) | Typ e-maila                                      |
| `lead_id`         | `uuid`                     | NULL, FK → leads(id) ON DELETE SET NULL                                                                                                                                         | Odniesienie do zgłoszenia (jeśli dotyczy)        |
| `offer_id`        | `uuid`                     | NULL, FK → offers(id) ON DELETE SET NULL                                                                                                                                        | Odniesienie do oferty (jeśli dotyczy)            |
| `user_id`         | `uuid`                     | NULL, FK → users(id) ON DELETE SET NULL                                                                                                                                         | Odniesienie do użytkownika (jeśli dotyczy)       |
| `status`          | `text`                     | NOT NULL, DEFAULT 'pending', CHECK (status IN ('pending', 'sent', 'failed', 'bounced'))                                                                                         | Status wysyłki                                   |
| `error_message`   | `text`                     | NULL                                                                                                                                                                            | Komunikat błędu (jeśli wysyłka się nie powiodła) |
| `sent_at`         | `timestamp with time zone` | NULL                                                                                                                                                                            | Data faktycznego wysłania                        |
| `created_at`      | `timestamp with time zone` | NOT NULL, DEFAULT CURRENT_TIMESTAMP                                                                                                                                             | Data utworzenia wpisu                            |

**Notatki:**

- Służy do debugowania problemów z e-mailami
- Podstawa do przyszłego implementowania retry logiki
- Historia e-maili powinna być przechowywana długoterminowo

---

## 2. Relacje Między Tabelami

### Diagram Relacji

```
users (1) ──── (N) offers
  ├── (1) ──── (1) organizer_profiles
  ├── (1) ──── (N) offer_status_history
  └── (1) ──── (N) email_logs

offers (1) ──── (N) offer_categories (N) ──── (1) categories
offers (1) ──── (1) offer_types
offers (1) ──── (N) offer_schedules
offers (1) ──── (N) offer_images
offers (1) ──── (N) offer_status_history
offers (1) ──── (N) leads
offers (1) ──── (N) email_logs
offers (1) ──── (N) offer_duplicates (both directions)

leads (N) ──── (1) offers
```

### Szczegółowe Relacje

| Z Tabeli    | Na Tabelę            | Typ | Kolumny                                             | ON DELETE |
| ----------- | -------------------- | --- | --------------------------------------------------- | --------- |
| users       | offers               | 1:N | users.id → offers.user_id                           | CASCADE   |
| users       | organizer_profiles   | 1:1 | users.id → organizer_profiles.user_id               | CASCADE   |
| users       | offer_status_history | 1:N | users.id → offer_status_history.changed_by          | NO ACTION |
| users       | email_logs           | 1:N | users.id → email_logs.user_id                       | SET NULL  |
| offer_types | offers               | 1:N | offer_types.id → offers.offer_type_id               | RESTRICT  |
| offers      | offer_categories     | 1:N | offers.id → offer_categories.offer_id               | CASCADE   |
| categories  | offer_categories     | 1:N | categories.id → offer_categories.category_id        | RESTRICT  |
| offers      | offer_schedules      | 1:N | offers.id → offer_schedules.offer_id                | CASCADE   |
| offers      | offer_images         | 1:N | offers.id → offer_images.offer_id                   | CASCADE   |
| offers      | offer_status_history | 1:N | offers.id → offer_status_history.offer_id           | CASCADE   |
| offers      | leads                | 1:N | offers.id → leads.offer_id                          | CASCADE   |
| offers      | email_logs           | 1:N | offers.id → email_logs.offer_id                     | SET NULL  |
| offers      | offer_duplicates     | 1:N | offers.id → offer_duplicates.offer_id_1, offer_id_2 | CASCADE   |
| leads       | email_logs           | 1:N | leads.id → email_logs.lead_id                       | SET NULL  |

---

## 3. Indeksy

### 3.1 Indeksy Podstawowe (Performance)

```sql
-- Tabela: offers
CREATE INDEX idx_offers_user_id ON offers(user_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_offer_type_id ON offers(offer_type_id);
CREATE INDEX idx_offers_created_at ON offers(created_at DESC);
CREATE INDEX idx_offers_start_date ON offers(start_date);
CREATE INDEX idx_offers_end_date ON offers(end_date);
CREATE INDEX idx_offers_deleted_at ON offers(deleted_at);

-- Tabela: organizer_profiles
CREATE INDEX idx_organizer_profiles_user_id ON organizer_profiles(user_id);

-- Tabela: offer_categories
CREATE INDEX idx_offer_categories_offer_id ON offer_categories(offer_id);
CREATE INDEX idx_offer_categories_category_id ON offer_categories(category_id);
CREATE UNIQUE INDEX idx_offer_categories_unique ON offer_categories(offer_id, category_id);

-- Tabela: offer_schedules
CREATE INDEX idx_offer_schedules_offer_id ON offer_schedules(offer_id);

-- Tabela: offer_images
CREATE INDEX idx_offer_images_offer_id ON offer_images(offer_id);

-- Tabela: offer_status_history
CREATE INDEX idx_offer_status_history_offer_id ON offer_status_history(offer_id);
CREATE INDEX idx_offer_status_history_changed_at ON offer_status_history(changed_at DESC);

-- Tabela: leads
CREATE INDEX idx_leads_offer_id ON leads(offer_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_status ON leads(status);

-- Tabela: email_logs
CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
```

### 3.2 Indeksy Przestrzenne (Geospatial Queries)

```sql
-- Tabela: offers
-- GIST index dla efektywnych zapytań geolokalizacyjnych (proximity searches)
CREATE INDEX idx_offers_location_gist ON offers USING GIST(location)
WHERE deleted_at IS NULL AND status = 'published';

-- Dodatkowy BRIN index dla big data (jeśli baza będzie zawierać miliony ofert)
-- CREATE INDEX idx_offers_location_brin ON offers USING BRIN(location);
```

### 3.3 Indeksy Full-Text Search (Dla Duplikatów)

```sql
-- Tabela: offers
-- GIN index dla full-text search przy wyszukiwaniu duplikatów
CREATE INDEX idx_offers_title_description_gin ON offers
USING GIN(to_tsvector('polish', title || ' ' || description))
WHERE deleted_at IS NULL;
```

### 3.4 Indeksy Złożone (Composite Indexes)

```sql
-- Tabela: offers
-- Dla zapytań filtrujących po statusie, dacie i lokalizacji
CREATE INDEX idx_offers_status_dates ON offers(status, start_date, end_date)
WHERE deleted_at IS NULL;

-- Tabela: leads
-- Dla zapytań wyświetlających zgłoszenia organizatora
CREATE INDEX idx_leads_offer_created ON leads(offer_id, created_at DESC);

-- Tabela: offer_status_history
-- Dla śledzenia historii zmian
CREATE INDEX idx_offer_status_history_offer_changed ON offer_status_history(offer_id, changed_at DESC);
```

---

## 4. Zasady PostgreSQL Row Level Security (RLS)

### Konfiguracja Ról i Uprawnień

Supabase Auth zapewnia trzy role za pośrednictwem JWT claims:

- **`authenticated`**: Zalogowani użytkownicy (organizatorzy)
- **`anon`**: Anonimowi użytkownicy (rodzice)
- **`admin`**: Administratorzy (rola niestandardowa w JWT)

### 4.1 Polityki dla Tabeli `offers`

```sql
-- Włączenie RLS na tabeli offers
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Polityka 1: Anonimowi użytkownicy (rodzice) widią tylko opublikowane oferty
CREATE POLICY offers_select_published ON offers
  FOR SELECT
  TO anon
  USING (status = 'published' AND deleted_at IS NULL);

-- Polityka 2: Zalogowani organizatorzy widzą:
--   - Swoje własne oferty (wszystkie statusy)
--   - Opublikowane oferty innych (do wyszukiwania)
CREATE POLICY offers_select_organizer ON offers
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id) OR
    (status = 'published' AND deleted_at IS NULL)
  );

-- Polityka 3: Administratorzy widzą wszystkie oferty
CREATE POLICY offers_select_admin ON offers
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Polityka 4: Organizatorzy mogą dodawać nowe oferty
CREATE POLICY offers_insert_organizer ON offers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Polityka 5: Organizatorzy mogą edytować tylko swoje oferty
CREATE POLICY offers_update_organizer ON offers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Polityka 6: Organizatorzy mogą usuwać tylko swoje oferty (soft delete)
CREATE POLICY offers_delete_organizer ON offers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Polityka 7: Administratorzy mogą aktualizować oferty (dla moderacji)
CREATE POLICY offers_update_admin ON offers
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');
```

### 4.2 Polityki dla Tabeli `organizer_profiles`

```sql
-- Włączenie RLS
ALTER TABLE organizer_profiles ENABLE ROW LEVEL SECURITY;

-- Polityka 1: Organizatorzy mogą widzieć tylko swój profil
CREATE POLICY organizer_profiles_select_own ON organizer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Polityka 2: Administratorzy mogą widzieć wszystkie profile
CREATE POLICY organizer_profiles_select_admin ON organizer_profiles
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Polityka 3: Organizatorzy mogą aktualizować tylko swój profil
CREATE POLICY organizer_profiles_update_own ON organizer_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 4.3 Polityki dla Tabeli `leads`

```sql
-- Włączenie RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Polityka 1: Anonimowi użytkownicy nie mogą czytać zgłoszeń
-- (brak SELECT polityki dla anon)

-- Polityka 2: Organizatorzy mogą widzieć zgłoszenia tylko do swoich ofert
CREATE POLICY leads_select_organizer ON leads
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM offers WHERE user_id = auth.uid()
    )
  );

-- Polityka 3: Administratorzy mogą widzieć wszystkie zgłoszenia
CREATE POLICY leads_select_admin ON leads
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Polityka 4: Anonimowi użytkownicy mogą dodawać zgłoszenia
CREATE POLICY leads_insert_anon ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Polityka 5: Zalogowani użytkownicy mogą dodawać zgłoszenia
CREATE POLICY leads_insert_authenticated ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Polityka 6: Organizatorzy mogą aktualizować status zgłoszenia
CREATE POLICY leads_update_organizer ON leads
  FOR UPDATE
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM offers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    offer_id IN (
      SELECT id FROM offers WHERE user_id = auth.uid()
    )
  );

-- Polityka 7: Administratorzy mogą aktualizować zgłoszenia
CREATE POLICY leads_update_admin ON leads
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');
```

### 4.4 Polityki dla Tabeli `offer_status_history`

```sql
-- Włączenie RLS
ALTER TABLE offer_status_history ENABLE ROW LEVEL SECURITY;

-- Polityka 1: Organizatorzy mogą widzieć historię swoich ofert
CREATE POLICY offer_status_history_select_organizer ON offer_status_history
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM offers WHERE user_id = auth.uid()
    )
  );

-- Polityka 2: Administratorzy mogą widzieć całą historię
CREATE POLICY offer_status_history_select_admin ON offer_status_history
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Polityka 3: System może dodawać wpisy (trigger)
CREATE POLICY offer_status_history_insert_system ON offer_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### 4.5 Polityki dla Tabeli `offer_images`

```sql
-- Włączenie RLS
ALTER TABLE offer_images ENABLE ROW LEVEL SECURITY;

-- Polityka 1: Wszystko mogą widzieć oferty z published offers
CREATE POLICY offer_images_select_public ON offer_images
  FOR SELECT
  TO anon
  USING (
    offer_id IN (
      SELECT id FROM offers
      WHERE status = 'published' AND deleted_at IS NULL
    )
  );

-- Polityka 2: Organizatorzy mogą widzieć zdjęcia swoich ofert
CREATE POLICY offer_images_select_organizer ON offer_images
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM offers WHERE user_id = auth.uid()
    )
  );

-- Polityka 3: Organizatorzy mogą dodawać zdjęcia do swoich ofert
CREATE POLICY offer_images_insert_organizer ON offer_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    offer_id IN (
      SELECT id FROM offers WHERE user_id = auth.uid()
    )
  );

-- Polityka 4: Organizatorzy mogą usuwać zdjęcia ze swoich ofert
CREATE POLICY offer_images_delete_organizer ON offer_images
  FOR DELETE
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM offers WHERE user_id = auth.uid()
    )
  );
```

### 4.6 Polityki dla Tabeli `offer_categories`

```sql
-- Włączenie RLS
ALTER TABLE offer_categories ENABLE ROW LEVEL SECURITY;

-- Polityka 1: Wszystko mogą widzieć kategorie opublikowanych ofert
CREATE POLICY offer_categories_select_public ON offer_categories
  FOR SELECT
  TO anon
  USING (
    offer_id IN (
      SELECT id FROM offers
      WHERE status = 'published' AND deleted_at IS NULL
    )
  );

-- Polityka 2: Organizatorzy mogą zarządzać kategoriami swoich ofert
CREATE POLICY offer_categories_organizer ON offer_categories
  FOR ALL
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM offers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    offer_id IN (
      SELECT id FROM offers WHERE user_id = auth.uid()
    )
  );

-- Polityka 3: Administratorzy mogą zarządzać wszystkimi
CREATE POLICY offer_categories_admin ON offer_categories
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');
```

### 4.7 Polityki dla Tabeli `users`

```sql
-- Włączenie RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Polityka 1: Użytkownicy mogą widzieć tylko swój rekord
CREATE POLICY users_select_own ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Polityka 2: Administratorzy mogą widzieć wszystkich użytkowników
CREATE POLICY users_select_admin ON users
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Polityka 3: Użytkownicy mogą aktualizować tylko swój rekord
CREATE POLICY users_update_own ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### 4.8 Polityki dla Tabeli `email_logs`

```sql
-- Włączenie RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Polityka 1: Administratorzy mogą widzieć wszystkie logi
CREATE POLICY email_logs_select_admin ON email_logs
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Polityka 2: System może wstawiać logi (trigger/aplikacja)
CREATE POLICY email_logs_insert ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

## 5. Triggery i Funkcje

### 5.1 Trigger dla `offer_status_history`

Automatycznie rejestruje zmianę statusu w tabeli `offer_status_history`.

```sql
CREATE OR REPLACE FUNCTION record_offer_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO offer_status_history (
      offer_id,
      old_status,
      new_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER offer_status_change_trigger
  AFTER UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION record_offer_status_change();
```

### 5.2 Trigger dla `updated_at`

Automatycznie aktualizuje pole `updated_at` w tabelach.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dla tabeli offers
CREATE TRIGGER offers_updated_at_trigger
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Dla tabeli organizer_profiles
CREATE TRIGGER organizer_profiles_updated_at_trigger
  BEFORE UPDATE ON organizer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 5.3 Trigger dla Archiwizacji Ofert

Automatycznie archiwizuje oferty po upływie `end_date`.

```sql
CREATE OR REPLACE FUNCTION archive_expired_offers()
RETURNS void AS $$
BEGIN
  UPDATE offers
  SET status = 'archived', updated_at = CURRENT_TIMESTAMP
  WHERE status IN ('draft', 'pending_review', 'published')
    AND end_date < CURRENT_DATE
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Zaplanowanie jako job (można wykonać za pomocą pg_cron)
-- SELECT cron.schedule('archive_expired_offers', '0 2 * * *', 'SELECT archive_expired_offers()');
```

---

## 6. Rozszerzenia PostgreSQL

Wymagane rozszerzenia dla pełnej funkcjonalności:

```sql
-- PostGIS - obsługa typów geograficznych
CREATE EXTENSION IF NOT EXISTS postgis;

-- pg_trgm - dla full-text search i fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Opcjonalnie: pg_cron dla zaplanowanych tasków
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

## 7. Seed Data

### 7.1 Domyślne Typy Ofert

```sql
INSERT INTO offer_types (id, name, slug) VALUES
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Zajęcia cykliczne', 'cyclic-classes'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Kolonie letnie', 'summer-camps'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Półkolonie', 'day-camps'),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'Obozy', 'camps')
ON CONFLICT (slug) DO NOTHING;
```

### 7.2 Domyślne Kategorie

```sql
INSERT INTO categories (id, name, slug, description) VALUES
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, 'Sport', 'sport', 'Zajęcia sportowe i rekreacyjne'),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, 'Artystyczne', 'artistic', 'Zajęcia artystyczne i twórcze'),
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, 'Edukacyjne', 'educational', 'Zajęcia edukacyjne i naukowe'),
  ('650e8400-e29b-41d4-a716-446655440004'::uuid, 'Inne', 'other', 'Inne zajęcia')
ON CONFLICT (slug) DO NOTHING;
```

---

## 8. Uwagi i Decyzje Projektowe

### 8.1 Bezpieczeństwo Danych

1. **Szyfrowanie danych rodziców**: E-maile i numery telefonów w tabeli `leads` są szyfrowane na poziomie aplikacji przed przechowywaniem. Klucz szyfrowania zarządzany poza bazą danych.

2. **Row Level Security**: Wszystkie tabele mają włączone RLS z politykami dostosowanymi do trzech ról użytkownika (rodzic, organizator, admin).

3. **Soft Deletes**: Usunięcie użytkownika lub oferty nie powoduje kasacji danych, lecz oznaczenie kolumny `deleted_at`. Umożliwia to przywrócenie danych i prowadzenie pełnego audytu.

### 8.2 Wydajność Zapytań

1. **Spatial Indexing**: Index GIST na kolumnie `location` umożliwia efektywne zapytania geoprzestrzenne (np. "znajdź oferty w promieniu 10km").

2. **Composite Indexes**: Indeksy złożone (np. `status`, `start_date`, `end_date`) przyspieszają filtrowanie wielokolumnowe.

3. **Full-Text Search Index**: Index GIN na polu `title` i `description` wspomaga wyszukiwanie duplikatów za pomocą fuzzy matching.

### 8.3 Elastyczność Danych

1. **Array Type dla Lat**: Kolumna `ages` jako `integer[]` umożliwia przechowywanie nieciągłych przedziałów wiekowych (np. {7, 9} dla zajęć dla 7 i 9 latków).

2. **JSONB dla Snapshots**: Pole `offer_snapshot` w tabeli `leads` przechowuje JSON snapshot oferty w momencie zgłoszenia, zapewniając kontekst niezależnie od zmian oferty.

3. **Słowniki dla Typów i Kategorii**: Tabele `offer_types` i `categories` pozwalają łatwo rozszerzać listę bez zmian schematu.

### 8.4 Audyt i Historia

1. **offer_status_history**: Pełna historia zmian statusu oferty z informacją o tym, kto dokonał zmiany i kiedy.

2. **email_logs**: Historia wszystkich wysłanych e-maili dla debugowania i przyszłych retry mechanizmów.

3. **Automatyczne Timestampy**: Pola `created_at` i `updated_at` są automatycznie zarządzane przez triggery.

### 8.5 Relacje Między Tabelami

1. **Kaskadowe Usuwanie**: Usunięcie oferty automatycznie usuwało zgłoszenia, zdjęcia, harmonogramy itp. (ON DELETE CASCADE). To zapewnia spójność danych.

2. **Soft Delete z RESTRICT**: Niektóre relacje (np. do `offer_types`) używają RESTRICT aby zapobiec usunięciu referencyjnemu z aktywnych danych.

3. **Elastyczne Foreign Keys**: `email_logs` ma opcjonalne FK (NULL allowed) aby rejestrować e-maile nawet jeśli powiązane oferty są usunięte.

### 8.6 Skalowanie

1. **BRIN Index (przyszłość)**: Jeśli baza będzie zawierać miliony ofert, BRIN index na `location` będzie bardziej efektywny niż GIST dla big data.

2. **Partycjonowanie (przyszłość)**: Tabela `email_logs` może być partycjonowana po dacie dla szybszego dostępu do świeżych logów.

3. **Materialized Views (przyszłość)**: Koszyk liczby ofert per kategoria może być cachowany w materialized view dla szybszego raportowania.

### 8.7 Kompatybilność z Supabase

1. **Supabase Auth Integration**: Rola użytkownika przechowywana w JWT claims zamiast w bazie danych.

2. **Supabase Storage**: Zdjęcia przechowywane w Supabase Storage, a tabela `offer_images` zawiera jedynie referencje.

3. **Supabase Real-time**: Możliwość subskrypcji zmian w tabelach poprzez Supabase Real-time API (przygotowanie na przyszłość).

### 8.8 Validacja na Poziomie Bazy

1. **CHECK Constraints**: Wiele kolumn ma CHECK constraints (np. `available_spots >= 0`, `start_time < end_time`).

2. **UNIQUE Constraints**: Unikatowe kombinacje (np. `offer_id` + `category_id`) zapobiegają duplikatom.

3. **NOT NULL Constraints**: Wymagane pola oznaczone jako NOT NULL.

---

## 9. Strategia Migracji

Migracje będą tworzone za pomocą Supabase Migrations lub Prisma:

```bash
# Przykład migracji Supabase
supabase migration new create_initial_schema

# Przykład z Prisma
npx prisma migrate dev --name init
```

Każda migracja powinna zawierać:

- Tworzenie tabel
- Dodawanie indeksów
- Konfigurację RLS
- Seed data (dla słowników)

---

## 10. Checklist Implementacji

- [ ] Włączone rozszerzenia PostgreSQL (`postgis`, `pg_trgm`)
- [ ] Wszystkie tabele utworzone z proper constraints
- [ ] Wszystkie indeksy stworzone (B-tree, GIST, GIN)
- [ ] RLS włączone na wszystkich tabelach
- [ ] RLS polityki zdefiniowane dla trzech ról
- [ ] Triggery dla `updated_at` i `offer_status_history`
- [ ] Trigger dla archiwizacji ofert (lub zaplanowany job)
- [ ] Seed data wstawiony (typy i kategorie)
- [ ] Testowanie RLS polityk z różnymi rolami
- [ ] Dokumentacja dla developerów (jak kwerendy, jak korzystać z API)
- [ ] Backupy skonfigurowane w Supabase
