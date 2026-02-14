# Architektura UI dla Kidosy

## 1. Przegląd Struktury UI

Kidosy to platforma typu marketplace łącząca rodziców poszukujących zajęć dla dzieci z organizatorami tych zajęć. Architektura UI obsługuje trzy odrębne podróże użytkownika dla trzech głównych ról:

- **Anonimowy rodzic** - Przegląd, filtrowanie i zgłaszanie się na zajęcia bez rejestracji
- **Organizator (Authenticated)** - Zarządzanie ofertami, podgląd zgłoszeń i edycja profilu
- **Administrator** - Moderacja ofert, zarządzanie duplikatami i monitoring systemu

Interfejs jest budowany w oparciu o React 18+ z TypeScript, wykorzystując TanStack Router do routingu, TanStack Query do stanu serwera, Zustand do stanu UI, oraz shadcn/ui do komponentów. Architektura jest skalowalna, dostępna (WCAG 2.1 AA) i zoptymalizowana pod kątem wydajności.

---

## 2. Lista Widoków

### A. WIDOKI PUBLICZNE (Rodzic)

#### A1. Strona Główna z Mapą i Filtrowaniem

- **Ścieżka:** `/`
- **Główny cel:** Umożliwienie rodzicom przegądania dostępnych zajęć w interaktywnej mapie z możliwością wielokryterialnego filtrowania
- **Kluczowe informacje do wyświetlenia:**
  - Interaktywna mapa Google Maps ze sklasteryzowanymi markerami ofert
  - Pasek filtrów (wiek dziecka, kategoria, typ oferty, lokalizacja, promień)
  - Lista wyników ofert z podstawowymi informacjami (nazwa, wiek, lokalizacja, odległość)
  - Liczba wyników i aktywne filtry
  - Synchronizacja między mapą a listą (klik na marker podświetla w liście i vice versa)

- **Kluczowe komponenty widoku:**
  - `MapContainer` - Główny kontener mapy Google Maps z MarkerClusterer
  - `FilterPanel` - Panel filtrów (wiek, kategoria, typ, lokalizacja, promień) - umieszczony nad mapą na desktop, w bottom sheet na mobile
  - `OffersList` - Lista wyników z scrollowaniem, infinite scroll na mobile, paginacją na desktop
  - `OfferCard` - Kompaktna kartka oferty (nazwa, wiek, lokalizacja, odległość)
  - `LocationSearch` - Input z Google Places Autocomplete dla wyszukiwania lokalizacji
  - `FilterChips` - Aktywne filtry jako chips z możliwością usunięcia
  - `EmptyState` - Komunikat gdy filtry nie zwracają wyników
  - `LoadingState` - Skeleton loadery dla map i listy

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Responsywny layout (desktop: dwa panele, mobile: toggle mapa/lista). Mapa ładuje się poniżej 2 sekund. Filtry pamiętane w localStorage. Kliknięcie na marker otwiera szybki podgląd z linkiem "Szczegóły".
  - **Dostępność:** Semantyczny HTML z `<nav>`, `<main>`. Mapa ma alternatywny widok listy. Filtry z labels i ARIA. Live region informujący o liczbie wyników (aria-live="polite"). Skip link do głównej treści.
  - **Bezpieczeństwo:** Walidacja filtrów na kliencie z Zod. Sanityzacja query params. XSS prevention (React auto-escape). HTTPS tylko. Rate limiting po stronie API.

---

#### A2. Szczegóły Oferty

- **Ścieżka:** `/offers/:id`
- **Główny cel:** Wyświetlenie pełnych informacji o zajęciach i formularz zgłoszenia dla rodzica
- **Kluczowe informacje do wyświetlenia:**
  - Nazwa i pełny opis oferty
  - Galeria zdjęć (slider, lightbox po kliku)
  - Przedział wiekowy (od-do)
  - Terminy (data początkowa, końcowa, godziny dla zajęć cyklicznych)
  - Harmonogram (dni i godziny dla zajęć cyklicznych)
  - Lokalizacja (adres + mapa Google Maps ze skonkretnym markerem)
  - Liczba dostępnych miejsc
  - Kategoria i typ oferty
  - Dane kontaktowe organizatora (email, telefon)
  - Historia zmian statusu oferty (tylko dla admina)
  - Status (opublikowana, w trakcie, zakończona, archiwalna)

- **Kluczowe komponenty widoku:**
  - `OfferImageGallery` - Slider zdjęć z lightbox
  - `OfferHeader` - Nazwa, status, organizator
  - `OfferDetails` - Sekcje: wiek, terminy, harmonogram, lokalizacja, liczba miejsc
  - `OfferLocationMap` - Google Maps z markerem
  - `OrganizerInfo` - Nazwa, email, telefon z linkami do kontaktu
  - `LeadForm` - Formularz zgłoszenia (imię dziecka, wiek, imię rodzica, email, telefon, wiadomość opcjonalnie)
  - `OfferStatusBadge` - Wizualna reprezentacja statusu
  - `ErrorBoundary` - Obsługa błędów ładowania

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Przycisk "Zgłoś dziecko" dominuje. Po wysłaniu formularza pojawia się potwierdzenie z danymi organizatora. Możliwość powrotu do mapy bez utraty filtrów. Breadcrumbs pokazujące ścieżkę.
  - **Dostępność:** Semantyczne tytuły (h1, h2). Galeria ma zdjęcia z alt text. Formularz z labels i error messages (aria-describedby). Focus trap w formularzu. Keyboard navigation dla slidera.
  - **Bezpieczeństwo:** Walidacja formularza z Zod (email format, wiek > 0). Sanityzacja HTML opisu (DOMPurify). CSRF token na żądanie POST. Rate limiting na zgłoszenia (max 3 na IP/dzień).

---

#### A3. Formularz Rejestracji

- **Ścieżka:** `/auth/register`
- **Główny cel:** Rejestracja nowego organizatora z kontaktami i danymi firmy
- **Kluczowe informacje do wyświetlenia:**
  - Formularz multi-field: email, hasło, potwierdzenie hasła, nazwa firmy/osoby, telefon
  - Walidacja pól w real-time
  - Link "Mam już konto" do logowania
  - Informacja o wysłaniu emaila weryfikacyjnego

- **Kluczowe komponenty widoku:**
  - `RegistrationForm` - TanStack Form + Zod validation
  - `PasswordStrengthIndicator` - Visual feedback dla siły hasła
  - `InputField` - Reusable input z error message (shadcn/ui)
  - `ToastNotification` - Powiadomienie o wysłaniu emaila weryfikacyjnego
  - `LoadingState` - Spinner podczas submitu

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Walidacja onChange z debouncing. Error messages pod polami. Przycisk submit disabled gdy form invalid. Password visibility toggle.
  - **Dostępność:** Labels z htmlFor. Required fields zaznaczone. Descriptive error messages. Tab order logiczny.
  - **Bezpieczeństwo:** Min 8 znaków, wielka litera, cyfra w haśle (Zod validation). Email uniqueness validation na backend. Password hashing na backend (Supabase). Test na common passwords. No storing credentials client-side.

---

#### A4. Formularz Logowania

- **Ścieżka:** `/auth/login`
- **Główny cel:** Uwierzytelnienie organizatora
- **Kluczowe informacje do wyświetlenia:**
  - Email, hasło inputy
  - Link "Zapomniałem hasła"
  - Link do rejestracji
  - Komunikat błędu przy nieprawidłowych danych

- **Kluczowe komponenty widoku:**
  - `LoginForm` - TanStack Form + Zod
  - `InputField` - Reusable input
  - `Button` - Primary + disabled on loading
  - `Alert` - Błąd logowania

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Remember email (localStorage). Redirect do dashboard jeśli zalogowany. Auto-focus na email polu.
  - **Dostępność:** Semantic form z labels. Error message dla całego formularza (aria-alert).
  - **Bezpieczeństwo:** HTTPS. Rate limiting (max 5 prób/15 min). JWT token w httpOnly cookie. Email validation. Password hash check na backend.

---

#### A5. Reset Hasła

- **Ścieżka:** `/auth/password-reset`
- **Główny cel:** Inicjacja procedury resetowania hasła
- **Kluczowe informacje do wyświetlenia:**
  - Email input
  - Komunikat potwierdzenia wysłania linku reset
  - Link "Wróć do logowania"

- **Kluczowe komponenty widoku:**
  - `PasswordResetForm` - Email input + submit
  - `SuccessMessage` - Potwierdzenie wysłania
  - `ResendButton` - Ponowne wysłanie (cooldown)

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Cooldown 60s przed ponownym wysłaniem. Komunikat o wysłaniu.
  - **Dostępność:** Form semantycznie poprawna. Email validation jawna.
  - **Bezpieczeństwo:** Rate limiting (1 żądanie/min na email). Link reset valid 1 godzinę. Token wysyłany w URL secure.

---

#### A6. Potwierdzenie Resetu Hasła

- **Ścieżka:** `/auth/password-reset/confirm?token=<token>`
- **Główny cel:** Ustawienie nowego hasła
- **Kluczowe informacje do wyświetlenia:**
  - Nowe hasło input
  - Potwierdzenie hasła input
  - Walidacja siły hasła
  - Komunikat błędu jeśli token wygasł

- **Kluczowe komponenty widoku:**
  - `PasswordResetConfirmForm` - TanStack Form + Zod
  - `PasswordStrengthIndicator`
  - `Alert` - Token expired

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Password visibility toggle. Realtime strength indicator.
  - **Dostępność:** Labels i error messages.
  - **Bezpieczeństwo:** Token verification na backend. Min requirements dla hasła. Hash nowe hasło. Invalidate old sessions.

---

### B. WIDOKI ORGANIZATORA (Authenticated)

#### B1. Dashboard Organizatora

- **Ścieżka:** `/organizer/dashboard`
- **Główny cel:** Podsumowanie i szybki dostęp do głównych akcji
- **Kluczowe informacje do wyświetlenia:**
  - Liczba ofert w każdym statusie (draft, pending, published, archived) - jako karty/tiles
  - Badge z liczbą nowych zgłoszeń
  - Badge z liczbą pending ofert
  - Szybkie akcje: "Dodaj nową ofertę", "Przeglądaj zgłoszenia", "Edytuj profil"
  - Ostatnio zmienione oferty (3-5 ostatnich)
  - Powiadomienia (np. "Oferta zatwierdzona")
  - Rekomendacje (np. "Teraz dobry czas na dodanie oferty")

- **Kluczowe komponenty widoku:**
  - `StatCard` - Karty z liczebnością (draft: 2, pending: 1, itd.)
  - `BadgeNotification` - Badge z nową liczbą zgłoszeń/ofert
  - `ActionButtons` - Szybkie akcje z ikonami
  - `RecentOffersList` - Ostatnie 5 ofert (skeleton loader)
  - `NotificationsList` - Lista powiadomień system
  - `WelcomeMessage` - Personalizowany powitanie ("Witaj, [Imię]!")

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Dashboard ładuje się szybko (cached data). Aktywne filtry pokazane. Redirect do new offer jeśli first time.
  - **Dostępność:** Nagłówki hierarchiczne. Stats dostępne tekstowo nie tylko wizualnie. Live region dla powiadomień (aria-live="assertive").
  - **Bezpieczeństwo:** Autory ofert verified na backend. Data filtered by user_id. Rate limiting na fetch dashboard.

---

#### B2. Lista Moich Ofert

- **Ścieżka:** `/organizer/offers`
- **Główny cel:** Przegląd i zarządzanie wszystkimi ofertami organizatora
- **Kluczowe informacje do wyświetlenia:**
  - Tabela/lista ofert z kolumnami: nazwa, status, data utworzenia, liczba zgłoszeń, akcje
  - Filtry po statusie (wszystkie, draft, pending, published, archived)
  - Sortowanie (data utworzenia, data zmian, nazwa, termin)
  - Przycisk "Dodaj nową ofertę"
  - Akcje dla każdej oferty: Edytuj, Usuń, Podgląd, Archiwizuj

- **Kluczowe komponenty widoku:**
  - `OffersTable` lub `OffersList` - Tabela/lista z sortowaniem
  - `StatusFilter` - Radio/select do filtrowania
  - `OffersRow` - Wiersz tabeli z danymi i akcjami
  - `StatusBadge` - Wizualny status
  - `ActionMenu` - Dropdown menu z akcjami (Edit, Delete, Preview, Archive)
  - `DeleteConfirmDialog` - Modal potwierdzenia usunięcia
  - `EmptyState` - "Brak ofert. Dodaj pierwszą!"

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Sortowanie domyślnie po dacie zmian (DESC). Liczba zgłoszeń klikalna (przechodzi do leads). Visual feedback przy hover na row.
  - **Dostępność:** Tabela ma headers (th). Rows mają role="row". Akcje dostępne z klawiatury (Enter, Escape). Screen reader announces status.
  - **Bezpieczeństwo:** Tylko oferty autora wyświetlone. Delete wymaga potwierdzenia. Soft delete (nie hard delete).

---

#### B3. Dodawanie Nowej Oferty (4-krokowy Wizard)

- **Ścieżka:** `/organizer/offers/new`
- **Główny cel:** Stworzenie nowej oferty poprzez intuicyjny proces wieloetapowy
- **Kluczowe informacje do wyświetlenia:**
  - **Krok 1 (Podstawowe):** Nazwa, opis, kategorie (multi-select), typ oferty
  - **Krok 2 (Szczegóły):** Przedział wiekowy (sliders), daty (date picker), harmonogram (tabela z godzinami), liczba miejsc
  - **Krok 3 (Lokalizacja):** Google Places Autocomplete, marker na mapie, možliwóść drag & drop markera
  - **Krok 4 (Zdjęcia & Podsumowanie):** Upload zdjęć (drag & drop), reorder zdjęć (drag & drop), podgląd oferty, "Zapisz jako szkic" lub "Wyślij do moderacji"

- **Kluczowe komponenty widoku:**
  - `WizardForm` - TanStack Form z multi-step support
  - `FormStep` - Komponenty dla każdego kroku
  - `ProgressBar` - Visual progress (1/4, 2/4, itd.)
  - `FormFields` - Input, Textarea, Select, MultiSelect, Slider, DatePicker, TimePicker (shadcn/ui)
  - `LocationSearch` - Google Places Autocomplete
  - `LocationMap` - Google Maps z marker
  - `ImageUploadZone` - Drag & drop zone dla zdjęć
  - `ImageGalleryPreview` - Preview uploadowanych zdjęć z reorder
  - `OfferPreview` - Podgląd jak oferta będzie wyglądala
  - `NavigationButtons` - Back, Next, Save Draft, Submit

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Auto-save co 30s do drafts. Progres bar. Validation feedback na każdym kroku. "Back" i "Next" zawsze dostępne. Jeśli user wychodzi - confirm discard. Upload progress bar dla zdjęć. Max 10 zdjęć, 5MB każde.
  - **Dostępność:** Labels dla wszystkich fields. Error messages sotto polami (aria-describedby). Kroky ze spacją. Tab order logiczny. Descripcja form len/requirements accessibility.
  - **Bezpieczeństwo:** Walidacja Zod na każdym kroku. File type validation (jpg, png, webp). Virus scanning na backend (optional). Duplicate detection async (query api before submit). Organizer_id set na backend.

---

#### B4. Edycja Oferty

- **Ścieżka:** `/organizer/offers/:id/edit`
- **Główny cel:** Modyfikacja istniejącej oferty
- **Kluczowe informacje do wyświetlenia:**
  - Ten sam form jak dodawanie (4-krokowy wizard)
  - Pre-populated dane z bazy
  - Historia zmian (audit trail - lista poprzednich wersji, kto zmienił, kiedy)
  - Komunikat jeśli oferta już opublikowana ("Zmiana wymaga re-moderacji")
  - Przycisk "Anuluj zmiany"

- **Kluczowe komponenty widoku:**
  - `WizardForm` - TanStack Form z mode="edit"
  - `HistoryPanel` - Side panel z historią zmian (collapsible)
  - `ChangesList` - Lista zmian z username i timestampem
  - `ModificationWarning` - Alert jeśli oferta published

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Pre-population działa szybko (caching). Możliwość reset do poprzedniej wersji (via history). Auto-diff pokazywania co się zmieniło.
  - **Dostępność:** Historia w osobnym panelu (aria-label="Historia zmian"). Zmiany opisane tekstowo.
  - **Bezpieczeństwo:** Ownership verification. Log wszystkich zmian (audit table). Soft delete dla poprzednich wersji. Validation jak w POST.

---

#### B5. Zgłoszenia (Leads)

- **Ścieżka:** `/organizer/leads`
- **Główny cel:** Zarządzanie zgłoszeniami od rodziców do ofert organizatora
- **Kluczowe informacje do wyświetlenia:**
  - Lista zgłoszeń z kolumnami: imię dziecka, wiek, imię rodzica, email, telefon, oferta, status, data, akcje
  - Filtry: oferta (select), status (multi-select: nowe, kontaktowane, zatwierdzone, odrzucone)
  - Sortowanie: data, status, oferta
  - Możliwość rozwinięcia wiersza - widok szczegółowy ze zdjęciami dziecka (jeśli dostępne), notkami
  - Akcje: Zmień status, Dodaj notki, Usuń zgłoszenie
  - Badge z liczbą nowych zgłoszeń

- **Kluczowe komponenty widoku:**
  - `LeadsList` - Tabela/lista leadów
  - `LeadRow` - Wiersz z podstawowymi danymi
  - `LeadDetailPanel` - Rozwinięty widok szczegółowy (drawer/modal)
  - `StatusSelect` - Zmiana statusu
  - `NotesTextarea` - Notatki do leadów
  - `LeadFilters` - Filtry po ofercie i statusie
  - `StatusBadge` - Wizualny status
  - `EmptyState` - Brak zgłoszeń

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Click na row otwiera detail panel. Status change trigger email do rodzica (jeśli configured). Notatki auto-save co sekunde.
  - **Dostępność:** Tabela semantic. Detail panel ma close button. Tab order logiczny.
  - **Bezpieczeństwo:** Tylko own leads wyświetlone (filtered by user offers). Email rodzica masked (jeśli configured). Status updates logged.

---

#### B6. Profil Organizatora

- **Ścieżka:** `/organizer/profile`
- **Główny cel:** Edycja danych organizatora i preferencji konta
- **Kluczowe informacje do wyświetlenia:**
  - Formularz z polami: nazwa firmy/osoby, telefon, email, email_public (do wyświetlenia rodzicom)
  - Sekcja: Zmiana hasła
  - Sekcja: Preferencje (notyfikacje, prywatność)
  - Przycisk: Wyloguj się
  - Przycisk: Usuń konto (z potwierdzeniem)

- **Kluczowe komponenty widoku:**
  - `ProfileForm` - TanStack Form + Zod dla edycji danych
  - `PasswordChangeForm` - Stare hasło, nowe hasło, potwierdzenie
  - `PreferencesSection` - Toggle switches dla notyfikacji
  - `DangerZone` - Delete account button
  - `DeleteAccountModal` - Potwierdzenie z wpisaniem "DELETE"
  - `SuccessMessage` - Toast po save
  - `VerificationPending` - Info jeśli email zmieniony i awaiting verification

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Save button disabled gdy brak zmian. Validation onChange. Nowe email wymaga verification (link wysłany). Auto-logout po delete konta.
  - **Dostępność:** Labels. Error messages. Confirmation dialog dla delete.
  - **Bezpieczeństwo:** Old password verification przed zmianą hasła. Email uniqueness check. Confirm action via dialog. Soft delete konta (archive). All actions logged (audit).

---

### C. WIDOKI ADMINA

#### C1. Kolejka Moderacyjna

- **Ścieżka:** `/admin/pending`
- **Główny cel:** Przegląd i zatwierdzanie/odrzucanie ofert czekających na moderację
- **Kluczowe informacje do wyświetlenia:**
  - Lista ofert w statusie pending_review, posortowana po dacie submission (najnowsze pierwsze)
  - Dla każdej oferty: nazwa, organizator, data submission, podgląd treści (pierwszy 100 znaków)
  - Liczba pending ofert w badge w headerze
  - Status moderacji (przy ułamku ofert może byc: "in-review" jeśli ktoś inny to patrzy)
  - Szczegóły oferty dostępne w sidepanelu/modalu

- **Kluczowe komponenty widoku:**
  - `PendingOffersList` - Lista ofert pending
  - `OfferPreviewCard` - Karta z podglądem (nazwa, org, date)
  - `OfferDetailPanel` - Szczegóły oferty (drawer/modal z full content)
  - `ApprovalButtons` - "Zatwierdź" (green), "Odrzuć" (red)
  - `RejectionReasonSelect` - Select z powodami odrzucenia
  - `RejectionMessageTextarea` - Custom message dla organizatora
  - `EmptyState` - "Brak ofert do moderacji"
  - `StatusBadge` - "In Review" jeśli ktoś zmienia

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Detail panel bokiem (desktop). Click ofertę → detail. Approve/Reject buttons z confirmem. Message field dla reject (optional, filled from reasons). Toast po akcji. Real-time update badges.
  - **Dostępność:** List semantic. Detail panel ma close button. Button intent jasna (Approve green, Reject red). Reason select labeled.
  - **Bezpieczeństwo:** Admin_id logged przy approval/reject. Timestamp recorded. Email sent do organizatora. Offer data immutable po approval (history tracked).

---

#### C2. Zarządzanie Duplikatami

- **Ścieżka:** `/admin/duplicates`
- **Główny cel:** Przegląd i obsługa potencjalnych ofert duplikatów
- **Kluczowe informacje do wyświetlenia:**
  - Para ofert flagowanych jako duplikaty
  - Similarity score (0-100%)
  - Dla każdej oferty: nazwa, organizator, data, lokalizacja, termin
  - Akcje: "To są duplikaty" (delete one), "Nie są duplikaty" (dismiss)
  - Historia duplikatów (archived/resolved)

- **Kluczowe komponenty widoku:**
  - `DuplicatePairsList` - Lista par ofert
  - `DuplicatePairCompare` - Porównanie dwóch ofert side-by-side
  - `SimilarityScore` - Visual score (meter)
  - `ComparisonFields` - Nazw, org, lokacja, termin side-by-side
  - `ActionButtons` - "To duplikaty", "Nie duplikaty"
  - `DeleteConfirm` - Który duplikat usunąć
  - `EmptyState` - Brak duplikatów

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Click para → detail. Porównanie side-by-side. Similarity score visualized. Action requires confirm. Duplikat removable (soft delete).
  - **Dostępność:** Comparison table semantic. Score described tekstowo i numerycznie.
  - **Bezpieczeństwo:** Admin_id logged. Action immutable (can't reverse). Email sent do obu organizatorów jeśli delete.

---

#### C3. Zarządzanie Użytkownikami

- **Ścieżka:** `/admin/users`
- **Główny cel:** Przegląd i zarządzanie kontami organizatorów
- **Kluczowe informacje do wyświetlenia:**
  - Lista organizatorów z kolumnami: imię/nazwa, email, data rejestracji, liczba ofert, liczba zgłoszeń, status konta (active/verified/banned/pending verification)
  - Filtry: status, data rejestracji (range)
  - Sortowanie: data reg, liczba ofert, nazwa
  - Akcje dla każdego: Zobacz profil, Zobacz oferty, Rozsyłanie email, Blokuj/Odblokuj konto

- **Kluczowe komponenty widoku:**
  - `UsersList` - Tabela użytkowników
  - `UserRow` - Wiersz z danymi
  - `StatusBadge` - Status konta
  - `ActionMenu` - Dropdown z akcjami
  - `UserDetailPanel` - Szczegóły profilu (drawer)
  - `UserOffersPanel` - Lista ofert tego użytkownika
  - `BanConfirmDialog` - Ban/Unban confirmation
  - `EmptyState` - Brak użytkowników

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Click user → detail. Liczba ofert linkuje do listy ofert. Email akcje (kontakt/newsletter).
  - **Dostępność:** Tabela semantic. Actions z tooltips.
  - **Bezpieczeństwo:** Admin_id logged dla każdej akcji. Ban immutable (can unban). Email addresses masked (partial). Audit trail.

---

#### C4. Logi Emaili

- **Ścieżka:** `/admin/email-logs`
- **Główny cel:** Monitoring wszystkich wysłanych emaili z platformy
- **Kluczowe informacje do wyświetlenia:**
  - Tabela z kolumnami: email recipient, typ (verification, approval, rejection, lead submission, password reset, etc.), status (sent, failed, bounced), data, message preview
  - Filtry: typ emaila, status, data range, recipient search
  - Sortowanie: data (default DESC)
  - Akcje: Pokaż pełny email, Resend

- **Kluczowe komponenty widoku:**
  - `EmailLogsList` - Tabela logu emaili
  - `EmailLogRow` - Wiersz z danymi
  - `StatusBadge` - Sent/Failed/Bounced
  - `EmailDetailModal` - Pełny email (html preview)
  - `ResendButton` - Resend email
  - `EmailFilters` - Filtry
  - `EmptyState` - Brak emaili

- **UX, dostępność i bezpieczeństwo:**
  - **UX:** Click row → detail. HTML preview. Resend requires confirm.
  - **Dostępność:** Tabela semantic. Status clear.
  - **Bezpieczeństwo:** Email addresses masked. Log content immutable. Resend audit trailed.

---

## 3. Mapa Podróży Użytkownika

### Podróż Główna: Rodzic Przegląda Oferty i Zgłasza Dziecko

```
START: Rodzic odwiedza stronę główną (/)
  ↓
KROK 1: Widzi mapę z ofertami
  - Strona ładuje się z ostatnimi filtami (localStorage)
  - Widzi wszystkie opublikowane oferty jako markery na mapie
  - Markery sklasteryzowane (liczna > 3 markery w area)
  ↓
KROK 2: Stosuje filtry (opcjonalnie)
  - Klik na "Filtry" → otwarcie panelu na desktop (już widoczny), bottom sheet na mobile
  - Wybiera wiek dziecka (np. 6-8 lat)
  - Wybiera kategorię (np. sport)
  - Wpisuje lokalizację (autocomplete) → promień 10km
  - Filtry synchronizują się z URL query params
  - Mapa i lista aktualizują się na bieżąco
  - Aktywne filtry pokazane jako chips pod filterami
  ↓
KROK 3: Przegląda wyniki
  - Lista ofert po lewej (desktop) lub po mapie (mobile)
  - Klik na marker lub ofertę w liście → highlight
  - Widzi: nazwa, wiek, lokalizacja, odległość od wybranego miejsca
  ↓
KROK 4: Wybiera interesującą ofertę
  - Klik na marker/ofertę → przechodzi do /offers/:id
  - Widzi pełne szczególy: opis, zdjęcia, harmonogram, organizator
  ↓
KROK 5: Wypełnia formularz zgłoszenia
  - Form: imię dziecka*, wiek*, imię rodzica*, email*, telefon*, wiadomość (opcjonalnie)
  - Walidacja onChange (jeśli invalid field → red border + error message)
  - Klik "Zgłoś dziecko"
  ↓
KROK 6: Potwierdzenie i email
  - Modal: "Dziękujemy! Organizator skontaktuje się z Tobą wkrótce."
  - Email do rodzica: "Potwierdzenie zgłoszenia - dane dziecka, dane organizatora, jak się skontaktować"
  - Email do organizatora: "Nowe zgłoszenie - dane dziecka, dane rodzica, wiadomość"
  ↓
END: Rodzic powraca do mapy lub zamyka
```

---

### Podróż Organizatora: Rejestracja, Dodanie Oferty, Moderacja i Zgłoszenia

```
START: Organizator klik "Dla Organizatorów" na stronie głównej
  ↓
KROK 1: Rejestracja (/)
  - Transfer do /auth/register
  - Wypełnia: email, hasło, potwierdzenie hasła, nazwa firmy, telefon
  - Walidacja:
    * Email: format valid, nie bity w bazie
    * Hasło: min 8 znaków, wielka litera, cyfra
    * Inne pola: nie puste
  - Klik "Zarejestruj"
  - Email weryfikacyjny wysłany
  ↓
KROK 2: Weryfikacja emaila
  - Organizator otwiera email
  - Klik link weryfikacyjny (válid 24h)
  - Konto aktywne
  - Auto-login do dashboardu
  ↓
KROK 3: Dashboard (/organizer/dashboard)
  - Welcome message: "Witaj, [Imię]!"
  - Stats: draft (0), pending (0), published (0), archived (0)
  - CTA: "Dodaj nową ofertę"
  ↓
KROK 4: Dodawanie oferty (wizard /organizer/offers/new)
  - Krok 1 (Podstawowe):
    * Nazwa: "Letnie zajęcia szachowe"
    * Opis: [long text]
    * Kategoria: select "Edukacyjne"
    * Typ: select "Kolonie letnie"
    * Submit: Next
  - Krok 2 (Szczegóły):
    * Wiek: From 8 to 12 (sliders)
    * Data początkowa: 2026-06-01
    * Data końcowa: 2026-08-31
    * Harmonogram: Pn-Pt 9:00-12:00
    * Liczba miejsc: 20
    * Submit: Next
  - Krok 3 (Lokalizacja):
    * Search: "Warszawa, ul. Marszałkowska"
    * Marker na mapie, możliwość drag & drop
    * Next
  - Krok 4 (Zdjęcia):
    * Drag & drop 3 zdjęcia
    * Reorder (drag wewnątrz)
    * Preview oferty (jak będzie wyglądla dla rodziców)
    * "Zapisz jako szkic" (draft status) lub "Wyślij do moderacji" (pending status)
  ↓
KROK 5: Submit do moderacji
  - Email: "Oferta wysłana do moderacji. Czekamy na zatwierdzenie admina."
  - Oferta w statusie "pending_review"
  - Organizator widzi ofertę w /organizer/offers z statusem "Oczekiwanie na moderację"
  ↓
KROK 6: Admin moderuje (admin flow - patrz poniżej)
  - Admin zatwierdza → Email do organizatora "Gratulacje! Twoja oferta opublikowana."
  - lub Admin odrzuca → Email "Niestety, oferta odrzucona z powodu: [reason]. Popraw i wyślij ponownie."
  ↓
KROK 7: Organizator zarządza zgłoszeniami
  - Klik /organizer/leads
  - Widzi listę zgłoszeń do swoich ofert
  - Dla każdego: imię dziecka, wiek, email rodzica, telefon, status (nowe, kontaktowane, zatwierdzone, odrzucone)
  - Zmienia status "nowe" → "kontaktowane" (organizator skontaktował się telefonicznie/emailem)
  - Może dodać notatki: "Potwierdzili udział"
  ↓
KROK 8: Zarządzanie ofertami
  - /organizer/offers: widzi listę
  - Może: Edytuj, Usuń, Archiwizuj, Podgląd
  - Po terminie oferta auto-archiwizuje
  ↓
END: Organizator sukces dzierżawy
```

---

### Podróż Admina: Moderacja i Monitorowanie

```
START: Admin zalogowany, widzi dashboard
  ↓
KROK 1: Widzi newki
  - Badge "Pending: 3" w headerze
  - Badge "Duplicates: 1" jeśli znajduje
  ↓
KROK 2: Przegląda kolejkę moderacyjną (/admin/pending)
  - Lista ofert pending, sorted by date DESC
  - Klik ofertę → detail panel z full content
  - Sprawdza: czy wszystkie pola filled, czy nie spam, czy nie duplikat
  ↓
KROK 3: Zatwierdzenie oferty
  - Klik "Zatwierdź"
  - Confirm dialog: "Zatwierdzić tę ofertę?"
  - Status zmienia się na "published"
  - Email do organizatora: "Gratuluję! Oferta opublikowana."
  - Toast: "Oferta zatwierdzona"
  ↓
LUB KROK 3B: Odrzucenie oferty
  - Klik "Odrzuć"
  - Modal: Powód (dropdown: "Niejasny opis", "Brakujące dane", "Spam", "Duplikat", etc.)
  - Optional message (textarea)
  - Klik "Odrzuć"
  - Status zmienia się na "rejected"
  - Email do organizatora: "Oferta odrzucona. Powód: [reason]. Popraw i wyślij ponownie."
  - Toast confirmation
  ↓
KROK 4: Przegląd duplikatów (/admin/duplicates)
  - System automatycznie flaguje podobne oferty
  - Admin widzi parę: Oferta A vs Oferta B (similarity 85%)
  - Porównanie side-by-side
  - Admin: "To są duplikaty" → czy usunąć A czy B
  - lub "Nie są duplikaty" → dismiss
  ↓
KROK 5: Monitoring użytkowników (/admin/users)
  - Lista organizatorów
  - Można blokowć podejrzane konta
  - Nie critical dla MVP, opcjonalnie
  ↓
KROK 6: Logi emaili (/admin/email-logs)
  - Monitoring czy wszystkie emaile wysłane
  - Search po recipient, type
  - Resend jeśli potrzeba
  ↓
END: Admin sukces moderacji
```

---

## 4. Układ i Struktura Nawigacji

### Hierarchia Nawigacji

Aplikacja ma trzy główne obszary (realms) dostępne poprzez authentication/authorization:

1. **Publiczny (Public)** - Brak logowania
2. **Organizator (Authenticated)** - Logowanie organizatora
3. **Admin (Protected)** - Admin only

### Layout Hierarchia

#### PublicLayout

Dla tras publicznych (`/`, `/offers/:id`, `/auth/*`)

```
┌─────────────────────────────────────────┐
│ HEADER                                  │
│ [Logo] [Dla Organizatorów] [Login]      │
└─────────────────────────────────────────┘
│                                         │
│ MAIN CONTENT (dynamic based on route)  │
│                                         │
└─────────────────────────────────────────┘
│ FOOTER                                  │
│ [Linki] [Kontakt] [Privacy] [Terms]    │
└─────────────────────────────────────────┘
```

#### OrganizerLayout

Dla tras `/organizer/*`

```
┌─────────────────────────────────────────────┐
│ HEADER                                      │
│ [Logo] [Nav: Dashboard|Oferty|Zgłoszenia]  │
│ [Avatar Dropdown] [Notifications]           │
└─────────────────────────────────────────────┘
├─────────┬──────────────────────────────────┤
│ SIDEBAR │ MAIN CONTENT                     │
│ [Nav]   │ [Breadcrumbs]                   │
│ items   │ [Dynamic content]               │
│         │                                  │
│         │                                  │
└─────────┴──────────────────────────────────┘
```

Sidebar minimalizuje się na tablet (drawer icon), zmienia się na bottom nav na mobile.

#### AdminLayout

Dla tras `/admin/*`

```
┌──────────────────────────────────────────┐
│ HEADER [ADMIN MODE]                      │
│ [Logo] [Pending: 3] [Duplicates: 1]     │
│ [Avatar Dropdown]                        │
└──────────────────────────────────────────┘
├────────┬───────────────────────────────┤
│SIDEBAR │ MAIN CONTENT                  │
│[Pending] │ [Breadcrumbs]              │
│[Dups]   │ [Dynamic content]           │
│[Users]  │                             │
│[Logs]   │                             │
└────────┴───────────────────────────────┘
```

### Nawigacja Główna

#### Publiczna

- Header: Logo (link `/ `) + "Dla Organizatorów" (link `/auth/login`) + "Zaloguj się" (link `/auth/login`)
- Footer: Linki (Privacy, Terms, Contact), Social media (optional)

#### Organizator (Horizontal + Sidebar)

**Horizontal (top nav):**

- Dashboard (icon + text)
- Moje Oferty (icon + text)
- Zgłoszenia (icon + text, badge with count)
- Profil (dropdown avatar)

**Sidebar (desktop) / Drawer (tablet) / Bottom nav (mobile):**

- Dashboard
- Moje Oferty
  - Dodaj nową
  - Opublikowane (20)
  - W oczekiwaniu (3)
  - Szkice (2)
  - Archiwalne
- Zgłoszenia (badge)
- Profil
- Wyloguj się

#### Admin (Sidebar + Horizontal)

**Header:**

- [ADMIN MODE] Badge
- Pending offers badge (3)
- Duplicates badge (1)
- Notifications dropdown
- Avatar dropdown (Profil, Logout)

**Sidebar:**

- Kolejka moderacyjna (pending: 3)
- Duplikaty (1)
- Użytkownicy
- Logi emaili

### Routing Structure (TanStack Router)

```typescript
// Paths constant
export const PATHS = {
  HOME: '/',
  OFFERS: {
    DETAIL: '/offers/:id',
  },
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PASSWORD_RESET: '/auth/password-reset',
    PASSWORD_RESET_CONFIRM: '/auth/password-reset/confirm',
  },
  ORGANIZER: {
    DASHBOARD: '/organizer/dashboard',
    OFFERS: {
      LIST: '/organizer/offers',
      NEW: '/organizer/offers/new',
      EDIT: '/organizer/offers/:id/edit',
    },
    LEADS: '/organizer/leads',
    PROFILE: '/organizer/profile',
  },
  ADMIN: {
    PENDING: '/admin/pending',
    DUPLICATES: '/admin/duplicates',
    USERS: '/admin/users',
    EMAIL_LOGS: '/admin/email-logs',
  },
};
```

### Breadcrumbs Navigation

Breadcrumbs wyświetlane na wszystkich non-home trasach:

- `/offers/:id` → "Strona główna > Oferta > [Nazwa oferty]"
- `/organizer/offers/:id/edit` → "Organizator > Moje Oferty > [Nazwa] > Edycja"
- `/admin/pending` → "Admin > Kolejka moderacyjna"

---

## 5. Kluczowe Komponenty

### Komponenty Wspólne (Shared)

#### FilterPanel

- Role: Kontener dla wszystkich filtrów (wiek, kategoria, typ, lokalizacja, promień)
- Props:
  - `activeFilters` - bieżące filtry z URL
  - `onFilterChange` - callback aktualizujący URL query params
  - `layout` - 'desktop' | 'mobile' (różne pozycjonowanie)
- UI: Collapsible na desktop, FullScreen Bottom Sheet na mobile
- State: TanStack Router URL sync + Zustand dla local toggle state

#### LocationSearch

- Role: Google Places Autocomplete do wyszukiwania lokalizacji
- Props:
  - `onSelect` - callback z lat/lon
  - `placeholder` - custom placeholder
- UI: Input z dropdown suggestions, icon do "use my location"
- Integration: Google Maps API

#### OfferCard

- Role: Wizualna karta oferty (compact)
- Props:
  - `offer` - dane oferty
  - `highlighted` - czy highlighted na mapie
  - `onSelect` - callback
- UI:
  - Tytuł, wiek, lokacja, odległość
  - Badge status
  - Hover effect

#### OfferDetailPanel

- Role: Full details oferty w drawer/modal
- Props:
  - `offerId` - ID oferty
  - `onClose` - callback
- UI: Scroll content, sticky header
- State: Fetches z TanStack Query

#### ImageGallery

- Role: Slider zdjęć z lightbox
- Props:
  - `images` - array of image URLs
  - `alt` - alt text
- UI: Thumbnails + main slider, lightbox na click

#### FormStep

- Role: Individual krok wizarda formularza
- Props:
  - `number` - nr kroku
  - `title` - tytuł kroku
  - `children` - form fields
  - `isValid` - czy krok valid
- UI: Title, progress, fields

#### LeadStatusSelect

- Role: Dropdown zmiana statusu leadów
- Props:
  - `currentStatus` - status
  - `onChange` - callback
- UI: Select z color-coded opcjami (nowe: red, kontaktowane: yellow, zatwierdzone: green)
- Mutation: Submit via useMutation (TanStack Query)

#### EmptyState

- Role: Placeholder gdy brak danych
- Props:
  - `icon` - SVG icon
  - `title` - nagłówek
  - `description` - opis
  - `action` - CTA button
- UI: Centered, illustrative

#### ErrorBoundary

- Role: Catch React errors dla graceful fallback
- Props:
  - `children` - content
  - `onError` - optional callback
- UI: Error message + retry button

#### LoadingState

- Role: Skeleton loader dla lists, tables
- Props:
  - `type` - 'list' | 'table' | 'card'
  - `count` - liczba skeletonów
- UI: Animated skeleton placeholders

#### Toast

- Role: Temporary notifications (success, error, info)
- Props:
  - `message` - tekst
  - `type` - 'success' | 'error' | 'info'
  - `duration` - ms
- UI: Fixed position (top-right desktop, top-center mobile)
- Trigger: Via `useToast()` hook

#### ConfirmDialog

- Role: Potwierdzenie akcji destructive (delete, reject, ban)
- Props:
  - `title` - "Are you sure?"
  - `description` - context
  - `confirmText` - "Delete"
  - `onConfirm` - callback
- UI: Modal z title, description, two buttons
- UX: Close on Escape, fokus na cancel by default

#### StatusBadge

- Role: Visual representation statusu oferty/leadów
- Props:
  - `status` - 'draft' | 'pending' | 'published' | 'archived' | 'rejected'
- UI: Color-coded badge (gray, yellow, green, gray, red)
- Text: Status value

### Layout Komponenty

#### PublicLayout

- Header: Logo, CTA buttons
- Main: `<Outlet />`
- Footer: Links

#### OrganizerLayout

- Header: Logo, horizontal nav, notifications, avatar
- Sidebar (desktop): Vertical nav
- Main: Breadcrumbs + `<Outlet />`
- Mobile: Bottom nav drawer toggle

#### AdminLayout

- Header: ADMIN mode badge, pending/duplicates badges, avatar
- Sidebar: Vertical nav
- Main: Breadcrumbs + `<Outlet />`

### Formy i Validation

#### useFormField

- Custom hook dla individual form field (TanStack Form)
- Props:
  - `name` - field name
  - `validate` - Zod schema
  - `debounce` - ms do debouncing
- Returns: value, error, onChange, onBlur

#### useWizardForm

- Custom hook dla multi-step form
- Props:
  - `steps` - number of steps
  - `onSubmit` - final callback
  - `onAutoSave` - auto-save draft callback
- Returns: currentStep, values, setValues, next, prev, submit

#### SearchForm

- Custom hook dla search/filter form
- Props:
  - `schema` - Zod validation schema
  - `onSearch` - callback z filters
  - `debounce` - 500ms
- Returns: values, setValues, search

### Map & Geolocation

#### GoogleMap

- Role: Mapa wyświetlająca markery ofert
- Props:
  - `offers` - array ofert z lat/lon
  - `center` - {lat, lon}
  - `zoom` - zoom level
  - `onMarkerClick` - callback
  - `clusterer` - MarkerClusterer config
- Features: Clustering, draggable markers (for admins), info windows

#### LocationMarker

- Role: Indywidualny marker na mapie
- Props:
  - `position` - {lat, lon}
  - `title` - offer name
  - `onClick` - callback
- UI: Custom icon (category colored)

---

## 6. Mapowanie Historyjek Użytkownika do Architektury

### Historyjki Rodzica (US-001 do US-014)

| User Story                            | Widok            | Komponenty                               | Ścieżka       | Notatki                                      |
| ------------------------------------- | ---------------- | ---------------------------------------- | ------------- | -------------------------------------------- |
| US-001: Przeszukiwanie ofert na mapie | Strona główna    | GoogleMap, OfferCard, MapContainer       | `/`           | Mapa ładuje się < 2s, filtry z localStorage  |
| US-002: Filtrowanie po wieku          | Strona główna    | FilterPanel, AgeSlider                   | `/`           | Query param age, live update                 |
| US-003: Filtrowanie po kategorii      | Strona główna    | FilterPanel, CategorySelect              | `/`           | Multi-select, live update                    |
| US-004: Filtrowanie po typie          | Strona główna    | FilterPanel, TypeSelect                  | `/`           | Multi-select, live update                    |
| US-005: Filtrowanie po lokalizacji    | Strona główna    | FilterPanel, LocationSearch              | `/`           | Google Places, promień radiowy               |
| US-006: Kombinacja filtrów            | Strona główna    | FilterPanel, FilterChips                 | `/`           | URL query params, localStorage               |
| US-007: Przeglądanie listy ofert      | Strona główna    | OffersList, OfferCard                    | `/`           | Infinite scroll mobile, paginacja desktop    |
| US-008: Szczegóły oferty              | Szczegóły oferty | OfferDetail, ImageGallery, OrganizerInfo | `/offers/:id` | Modal/drawer na mobile, page na desktop      |
| US-009: Zgłoszenie dziecka            | Szczegóły oferty | LeadForm, FormField                      | `/offers/:id` | Bez logowania, walidacja, email confirmation |
| US-010: Potwierdzenie zgłoszenia      | Szczegóły oferty | SuccessDialog, Toast                     | `/offers/:id` | Email do rodzica i organizatora              |
| US-011: Historia filtrów              | Strona główna    | FilterPanel                              | `/`           | localStorage persistence                     |
| US-012: Responsywność mobile          | Wszystkie widoki | Responsive components                    | Wszystkie     | Tailwind breakpoints                         |
| US-013: Obsługa błędów brak wyników   | Strona główna    | EmptyState                               | `/`           | Filter reset CTA                             |
| US-014: Obsługa błędów brak sieci     | Strona główna    | ErrorBoundary, Retry                     | `/`           | Network error alert                          |

### Historyjki Organizatora (US-015 do US-028)

| User Story                         | Widok                 | Komponenty                         | Ścieżka                          | Notatki                                    |
| ---------------------------------- | --------------------- | ---------------------------------- | -------------------------------- | ------------------------------------------ |
| US-015: Rejestracja                | Rejestracja           | RegistrationForm, PasswordStrength | `/auth/register`                 | Email verification, Zod validation         |
| US-016: Logowanie                  | Logowanie             | LoginForm, Alert                   | `/auth/login`                    | JWT httpOnly cookie, redirect dashboard    |
| US-017: Reset hasła                | Reset/Confirm         | PasswordResetForm                  | `/auth/password-reset`           | 1h valid token, email link                 |
| US-018: Edycja danych              | Profil                | ProfileForm                        | `/organizer/profile`             | Email verification if changed              |
| US-019: Dodawanie oferty           | Formularz dodawania   | WizardForm, FormStep + components  | `/organizer/offers/new`          | 4-krokowy wizard, auto-save                |
| US-020: Edycja oferty              | Formularz edycji      | WizardForm, HistoryPanel           | `/organizer/offers/:id/edit`     | Pre-population, history tracking           |
| US-021: Usuwanie oferty            | Lista ofert           | DeleteConfirmDialog                | `/organizer/offers`              | Soft delete, email confirmation            |
| US-022: Podgląd oferty             | Formularz             | PreviewPanel                       | `/organizer/offers/new` (krok 4) | Jak będzie wyglądala dla rodziców          |
| US-023: Archiwizacja               | Lista ofert           | ArchiveButton                      | `/organizer/offers`              | Auto-archive post end_date, toggle         |
| US-024: Zarządzanie miejscami      | Formularz / Szczegóły | PlacesInput                        | `/organizer/offers`              | Update via API                             |
| US-025: Powiadomienie o zgłoszeniu | -                     | Toast, Email system                | `/organizer/leads` (badge)       | Email trigger, in-app badge                |
| US-026: Filtrowanie ofert          | Lista ofert           | FilterPanel, StatusSelect          | `/organizer/offers`              | Filter by draft/pending/published/archived |
| US-027: Sortowanie ofert           | Lista ofert           | SortSelect                         | `/organizer/offers`              | Sort by date created/modified/name/term    |
| US-028: Potwierdzenie publikacji   | -                     | Toast, Email                       | `/organizer/dashboard`           | Email confirmation post approval           |

### Historyjki Admina (US-029 do US-033+)

| User Story              | Widok                     | Komponenty                           | Ścieżka             | Notatki                           |
| ----------------------- | ------------------------- | ------------------------------------ | ------------------- | --------------------------------- |
| US-029: Podgląd kolejki | Kolejka moderacyjna       | PendingOffersList, OfferDetailPanel  | `/admin/pending`    | Sorted by date DESC               |
| US-030: Zatwierdzenie   | Kolejka moderacyjna       | ApprovalButtons, ConfirmDialog       | `/admin/pending`    | Status change, email organizatora |
| US-031: Odrzucenie      | Kolejka moderacyjna       | RejectionReasonSelect, ConfirmDialog | `/admin/pending`    | Powód + optional message          |
| US-032: Walidacja pól   | Kolejka moderacyjna       | ValidationIndicator                  | `/admin/pending`    | Highlight missing fields          |
| US-033: Duplikaty       | Zarządzanie duplikatami   | DuplicatePairCompare, ActionButtons  | `/admin/duplicates` | Side-by-side comparison           |
| Beyond: Logi emaili     | Logi emaili               | EmailLogsList, EmailDetailModal      | `/admin/email-logs` | Search, filter, resend            |
| Beyond: Użytkownicy     | Zarządzanie użytkownikami | UsersList, ActionMenu                | `/admin/users`      | Ban/Unban, view offers            |

---

## 7. Rozwiązywanie Przypadków Brzegowych i Stanów Błędów

### Bezpieczeństwo i Walidacja

#### Client-side

- Wszystkie formy walidowane Zod schemami
- Real-time feedback dla invalida fields
- Submit zabezpieczony (disabled gdy form invalid)
- DOMPurify dla HTML content
- XSS prevention (React auto-escape)

#### Server-side (Backend)

- Duplikacja walidacji Zod
- Authorization checks (RLS policies Supabase)
- Input sanityzacja
- Rate limiting (API endpoints)
- CSRF token verification (Supabase JWT)
- Password hashing (bcrypt)
- Email verification
- Session timeout (idle 30 min)

### Obsługa Błędów API

#### Network Error

- Display: "Błąd połączenia. Sprawdź internet i spróbuj ponownie."
- Action: "Spróbuj ponownie" button
- Retry: exponential backoff (1s, 2s, 4s, max 30s)
- Toast: error type

#### 401 Unauthorized

- Redirect: `/auth/login`
- Message: "Sesja wygasła. Zaloguj się ponownie."
- Preserve: returnUrl query param dla redirect post-login

#### 403 Forbidden

- Display: Access denied message
- Redirect: `/` (home)
- Message: "Brak uprawnień do tej akcji."

#### 404 Not Found

- Display: Dedicated 404 page
- Action: "Wróć do strony głównej" link
- Message: "Nie znaleziono strony."

#### 422 Validation

- Display: Inline field errors (under each field)
- Format: `field.error` (e.g., "offer_type_id is required")
- Focus: First invalid field

#### 500 Server Error

- Display: "Coś poszło nie tak. Spróbuj ponownie."
- Action: "Spróbuj ponownie" button
- Log: Frontend error logging (Sentry optional)

### Loading States

#### Initial Load

- Skeleton loaders (50% performance)
- Progress bar (visual feedback)
- Estimated load time message

#### Background Refetch

- No interruption (silent)
- Optional icon indicator
- Toast optional ("Dane zaktualizowane")

#### Mutation (Form Submit)

- Button disabled + spinner
- Form inputs disabled
- Optimistic update (if applicable)
- Rollback on error

### Empty States

#### No Results

- Icon + "Brak wyników"
- "Zmień filtry i spróbuj ponownie"
- "Wyczyść filtry" button

#### No Data (First Time)

- Illustration + "Brak danych"
- Encouraging message
- CTA button (e.g., "Dodaj pierwszą ofertę")

#### No Permission

- Icon + "Brak dostępu"
- Redirect to appropriate page

### Race Conditions

#### Concurrent Mutations

- Form submit + auto-save = lock mechanism
- Disable auto-save during manual submit
- Show spinner for 500ms minimum (UX clarity)

#### Stale Cache During Edit

- Invalidate query on mutation success
- Optimistic update for smoothness
- Rollback on error

#### Multiple Filter Changes

- Debounce query param updates (500ms)
- Prevent flickering of map/list
- URL as source of truth

---

## 8. Podsumowanie Funkcjonalności Niezbędnych

### Kluczowe Cechy MVP

1. **Interaktywna Mapa** - Google Maps z klasteryzacją markerów, autocomplete lokalizacji
2. **Wielokryterialne Filtrowanie** - Wiek, kategoria, typ, lokalizacja, promień
3. **Szczegóły Oferty** - Full InfoPanel, galeria zdjęć, organizator info
4. **Formularz Zgłoszenia** - Bez logowania, walidacja, email confirmation
5. **Autentykacja** - Register, login, password reset via email
6. **Panel Organizatora** - Dashboard, lista ofert, dodawanie (wizard), edycja, zgłoszenia, profil
7. **Formularze Wieloetapowe** - 4-krokowy wizard dla ofert, auto-save, walidacja krok po kroku
8. **Moderacja** - Kolejka pending, approve/reject, powody, duplikaty
9. **System Powiadomień** - Toast, badges, email notifications, in-app alerts
10. **Responsywny Design** - Mobile-first, desktop optimized, tablet friendly
11. **Dostępność** - WCAG 2.1 AA, semantic HTML, ARIA, keyboard navigation
12. **Bezpieczeństwo** - Zod validation, RLS policies, JWT tokens, rate limiting, XSS prevention
13. **Wydajność** - TanStack Query caching, code splitting, image optimization, performance budgets
14. **Analytics** - GA4 event tracking (page_view, search, view_item, lead_submit, offer_create, etc.)

---

**Opracowano:** 8 lutego 2026
**Status:** Gotowe do implementacji
**Następny Etap:** Szczegółowe wireframes, user flows i specyfikacja komponentów
