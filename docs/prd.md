# Dokument wymagań produktu (PRD) - Kidosy

## 1. Przegląd produktu

Kidosy to platforma cyfrowa mająca na celu zcentralizowanie i ułatwienie wyszukiwania zajęć dodatkowych, kolonii, obozów i półkolonii dla dzieci w Polsce. Aplikacja łączy rodziców/opiekunów poszukujących ofert z organizatorami zajęć, którzy pragną promować swoje usługi w jednym, dedykowanym miejscu.

Wersja MVP skupia się na walidacji dwóch głównych hipotez:

- Organizatorzy są skłonni aktywnie dodawać i aktualizować swoje oferty na platformie
- Rodzice realnie korzystają z aplikacji do wyszukiwania i porównania zajęć dla swoich dzieci

Grupa docelowa MVP:

- Rodzice/opiekunowie w wieku 25–45 lat szukający zajęć dla dzieci
- Organizatorzy zajęć, kolonii, półkolonii, obozów

Zasięg geograficzny: Cała Polska

---

## 2. Problem użytkownika

### Rodzice i opiekunowie:

Informacje o dostępnych zajęciach dodatkowych, koloniach i półkoloniach są rozproszone pomiędzy mediami społecznościowymi, stronami internetowymi organizatorów, plakatami oraz poleceniami ustnymi. Ta fragmentacja prowadzi do:

- Trudności w znalezieniu ofert dopasowanych do wieku dziecka i lokalizacji
- Znacznego czasu spędzanego na wyszukiwaniu i porównywaniu opcji
- Ryzyka pominięcia atrakcyjnych ofert
- Braku wiarygodnego źródła informacji o dostępności i terminach

### Organizatorzy zajęć:

Nie posiadają prostego, scentralizowanego narzędzia do prezentacji swoich ofert. Zmuszeni są do:

- Utrzymania obecności na wielu platformach jednocześnie
- Ręcznego zarządzania rozproszonymi kanałami komunikacji
- Niedostatecznego dotarcia do potencjalnych klientów

---

## 3. Wymagania funkcjonalne

### 3.1 Główne funkcjonalności MVP

#### 3.1.1 Mapa interaktywna z wyszukiwaniem

- Wyświetlanie ofert na interaktywnej mapie z klastrowaniem przesunięć
- Możliwość powiększenia, zmniejszenia i przesuwania mapy
- Wyszukiwanie lokalizacji za pośrednictwem autocomplete (Google Maps Autocomplete)
- Wyświetlanie informacji o ofercie na kliknięcie na marker
- Alternatywny widok listy obok mapy
- Responsywny design dostosowany do urządzeń mobilnych

#### 3.1.2 System filtrów

Filtry mają być dostępne zarówno na mapie jak i w widoku listy:

- Wiek dziecka (kategorie wiekowe, np. 3–5, 6–8, 9–12, 13+)
- Kategoria zajęć (sport, artystyczne, edukacyjne, inne)
- Typ oferty (zajęcia cykliczne, kolonie letnie, półkolonie, obozy)
- Lokalizacja (miasto / promień od wybranej lokalizacji w km)
- Automatyczne zapamiętywanie ostatnich wyborów filtrów

#### 3.1.3 Widok szczegółów oferty

Każda oferta powinna zawierać:

- Nazwę i opis oferty
- Przedział wiekowy (od–do)
- Terminy (daty rozpoczęcia i zakończenia, godziny dla zajęć cyklicznych)
- Lokalizacja (adres + geopunkt na mapie)
- Liczba dostępnych miejsc lub status dostępności (dostępne / pełne / wyprzedane)
- Dane kontaktowe organizatora (e-mail, telefon)
- Kategoria i typ oferty
- Galeria zdjęć (opcjonalnie)

#### 3.1.4 System logowania i rejestracji organizatora

- Rejestracja organizatora (e-mail, hasło, dane firmy/osoby)
- Logowanie za pośrednictwem e-maila i hasła
- Resetowanie hasła za pośrednictwem e-maila
- Weryfikacja adresu e-mail przed pełnym dostępem do panelu
- Bezpieczne przechowywanie haseł (hashing)
- Sesje użytkownika z timeoutem (30 minut nieaktywności)

#### 3.1.5 Panel organizatora – CRUD ofert

- Dodawanie nowej oferty (formularz multi-step)
- Edycja istniejącej oferty
- Usunięcie oferty
- Podgląd oferty w aplikacji przed publikacją
- Historia zmian oferty (audyt)
- Możliwość oznaczenia oferty jako „archiwalna" po terminie

#### 3.1.6 Formularz zgłoszenia (bez płatności)

- Formularz dostępny dla rodziców bez rejestracji
- Pola: imię dziecka, wiek, imię rodzica, e-mail, telefon, wiadomość (opcjonalnie)
- Walidacja pól (obowiązkowe: imię dziecka, wiek, e-mail rodzica)
- Zapisanie zgłoszenia w bazie danych
- Status zgłoszenia: wysłane (initial state)
- Automatyczne powiadomienie e-mailem do organizatora z danymi zgłoszenia
- Automatyczne powiadomienie e-mailem do rodzica z potwierdzeniem zgłoszenia

#### 3.1.7 Moderacja ofert

- Prosta kolejka publikacji dla nowych ofert
- Walidacja obowiązkowych pól (co najmniej: nazwa, opis, wiek, termin, lokalizacja)
- Automatyczne wygaszanie ofert po upływie daty końcowej
- Sprawdzenie duplikatów (alarmy dla bardzo podobnych ofert)
- Panel admina do zatwierdzenia/odrzucenia ofert
- Komunikat zwrotny do organizatora (zatwierdzenie / powód odrzucenia)

#### 3.1.8 Infrastruktura i integracje

- Hosting: Vercel
- Mapy i geolokalizacja: Google Maps API + Autocomplete
- E-mailing: Mailjet (szablon powitania, potwierdzenia publikacji, zgłoszenia)
- Analytics: Google Analytics 4 (GA4)
- Konfiguracja SPF/DKIM dla dostarczalności maili

#### 3.1.9 UX/UI

- Pastelowe i ciepłe kolory (family-friendly)
- Mobile-first design
- Dostępność WCAG AA
- Intuicyjna nawigacja
- Szybkie ładowanie stron (Core Web Vitals)

---

## 4. Granice produktu

### Co nie wchodzi w zakres MVP:

- Obsługa płatności za rezerwacje (zaplanowana na post-MVP wraz z integracją Stripe)
- System ocen i recenzji
- Czat między rodzicem a organizatorem
- Zaawansowane zarządzanie kalendarzami i harmonogramami
- Integracje z zewnętrznymi systemami (CRM, systemy księgowe, kalendarze)
- Rozbudowana analityka i raportowanie (pełne dashboardy konwersji post-MVP)
- Import automatyczny ofert (zaplanowany na post-MVP)
- Personalizowane rekomendacje AI (zaplanowane na post-MVP)
- Panel admina z rozbudowanymi uprawnieniami
- Notyfikacje push
- Integracja z mediami społecznościowymi (fb share, etc.)
- Walidacja danych organizatora (NIP, certyfikaty)
- Historyczne dane o oferach (archiwizacja pełna)

---

## 5. Historyjki użytkowników

### 5.1 Historyjki – Rodzic / Opiekun

#### US-001: Przeszukiwanie ofert na mapie bez filtrów

Jako rodzic chcę zobaczyć mapę z dostępnymi zajęciami, aby szybko zorientować się, jakie opcje są dostępne w mojej okolicy.

Kryteria akceptacji:

- Mapa ładuje się w ciągu < 3 sekund
- Wszystkie oferty są wyświetlane jako markery na mapie
- Markery są sklasteryzowane, gdy są blisko siebie
- Mogę powiększyć/zmniejszyć mapę
- Mogę kliknąć na marker, aby zobaczyć szybki podgląd oferty (nazwa, wiek, lokalizacja)

#### US-002: Filtrowanie ofert po wieku dziecka

Jako rodzic chcę filtrować zajęcia po wieku mojego dziecka, aby znaleźć odpowiednie oferty.

Kryteria akceptacji:

- Mogę wybrać wiek dziecka z listy rozwijalnej (kategorie: 3–5, 6–8, 9–12, 13+)
- Po wybraniu wieku, mapa/lista aktualizuje się, pokazując tylko oferty dla tego wieku
- Filtr pozostaje aktywny, jeśli przechodzę do szczegółów oferty i wracam
- Mogę usunąć filtr wieku, klikając na X lub zaznaczenie

#### US-003: Filtrowanie ofert po kategorii

Jako rodzic chcę wyfiltrować zajęcia po kategorii (np. sport, sztuka), aby znaleźć aktywności, które interesują moje dziecko.

Kryteria akceptacji:

- Mogę wybrać jedną lub więcej kategorii (multi-select)
- Po wyborze kategorii, mapa/lista aktualizuje się natychmiast
- Mogę widać liczbę ofert dla każdej kategorii
- Mogę usunąć kategorie filtrów w dowolnym momencie

#### US-004: Filtrowanie ofert po typie (cykliczne/kolonie/półkolonie)

Jako rodzic chcę filtrować oferty po typie (zajęcia cykliczne vs. kolonie), aby znaleźć odpowiadającą mi formę.

Kryteria akceptacji:

- Dostępne są trzy opcje: zajęcia cykliczne, kolonie, półkolonie, obozy
- Mogę wybrać jeden lub więcej typów
- Liczba ofert zaktualizuje się po wyborze
- Mogę kombinować filtr typu z innymi filtrami

#### US-005: Filtrowanie ofert po lokalizacji

Jako rodzic chcę wyszukać zajęcia w mojej okolicy lub określonym mieście, aby znaleźć coś blisko domu.

Kryteria akceptacji:

- Mam pole wyszukiwania lokalizacji z autocomplete (Google Maps)
- Po wpisaniu miasta/adresu, mapa przechodzi do tej lokalizacji
- Mogę ustawić promień wyszukiwania (5 km, 10 km, 20 km, 50 km)
- Po ustawieniu promienia, wyświetlane są tylko oferty w tym zasięgu
- Mogę kliknąć na przycisk „Użyj mojej lokalizacji" (jeśli zgodzę się na dostęp do geolokalizacji)

#### US-006: Kombinacja filtrów

Jako rodzic chcę stosować wiele filtrów jednocześnie (wiek + kategoria + typ + lokalizacja), aby znaleźć najdokładniej dopasowane zajęcia.

Kryteria akceptacji:

- Wszystkie filtry działają niezależnie od siebie
- Wyniki aktualizują się w czasie rzeczywistym
- Widać aktywne filtry (tagging)
- Mogę usunąć poszczególne filtry lub wszystkie naraz
- Liczba wyników zmienia się dynamicznie

#### US-007: Przeglądanie listy ofert

Jako rodzic chcę zobaczyć listę oferek obok mapy, aby porównać więcej szczegółów.

Kryteria akceptacji:

- Lista wyświetla się obok mapy (layout side-by-side na desktopie, pod mapą na mobile)
- Każda pozycja na liście pokazuje: nazwę, wiek, lokalizację, odległość od wybranej lokalizacji
- Lista jest posortowana domyślnie po odległości
- Kliknięcie na ofertę w liście podświetla marker na mapie i pokazuje szczegóły
- Liczba pozycji na liście jest ograniczona, z możliwością scrollowania

#### US-008: Przeglądanie szczegółów oferty

Jako rodzic chcę zobaczyć pełne szczegóły oferty, aby podjąć decyzję o zgłoszeniu.

Kryteria akceptacji:

- Po kliknięciu na marker/ofertę, wyświetla się modal lub nowa strona ze szczegółami
- Widoczne są: nazwa, opis, wiek, terminy (daty/godziny), lokalizacja (mapa + adres), liczba miejsc, e-mail/telefon organizatora
- Zdjęcia są wyświetlane w galerii (jeśli dostępne)
- Mogę powrócić do mapy bez utraty filtrów
- Szczegóły ładują się poniżej 2 sekund

#### US-009: Zgłoszenie dziecka na zajęcia

Jako rodzic chcę zgłosić moje dziecko na zajęcia poprzez formularz w aplikacji, aby organizator mnie skontaktował.

Kryteria akceptacji:

- Na stronie szczegółów oferty jest przycisk „Zgłoś dziecko"
- Formularz zgłoszenia zawiera pola: imię dziecka, wiek, imię rodzica, e-mail, telefon, wiadomość (opcjonalnie)
- Pola obowiązkowe są zaznaczone
- Po wysłaniu formularz potwierdza, że zgłoszenie zostało wysłane
- Na e-mail rodzicem przychodzi potwierdzenie zgłoszenia
- Organizator otrzymuje maila z danymi dziecka i rodzicem

#### US-010: Potwierdzenie wysłania zgłoszenia

Jako rodzic chcę potwierdzić, że moje zgłoszenie zostało wysłane, aby wiedzieć, że organizator go otrzyma.

Kryteria akceptacji:

- Po wysłaniu formulału pojawia się potwierdzenie na stronie (komunikat: „Dziękujemy za zgłoszenie! Organizator skontaktuje się z tobą wkrótce.")
- Potwierdzenie e-mailem zawiera dane zgłoszenia i dane kontaktowe organizatora
- E-mail ma przyjazny dla rodziny ton i jasne instrukcje

#### US-011: Przeglądanie historii filtrów

Jako rodzic chcę, aby aplikacja pamiętała ostatnio używane filtry, aby nie musiał ich ustawiać od nowa.

Kryteria akceptacji:

- Po zamknięciu i ponownym otwarciu aplikacji, ostatnie filtry pozostają aktywne
- Filtry są przechowywane lokalnie (localStorage)
- Mogę wyczyścić historię filtrów za pośrednictwem przycisku „Resetuj filtry"

#### US-012: Responsywność aplikacji (mobile)

Jako rodzic używający urządzenia mobilnego chcę, aby aplikacja była dobrze funkcjonowała na małych ekranach.

Kryteria akceptacji:

- Mapa ma rozmiar dostosowany do ekranu mobile
- Przyciski i pola wejścia są wystarczająco duże do dotykania (minimum 48px)
- Tekst jest czytelny bez dodatkowego przybliżania
- Formularz zgłoszenia zmieści się na jednym ekranie (max 3 scrolly)
- Interfejs jest intuicyjny na mobile (single column layout)

#### US-013: Obsługa błędów – brak wyników

Jako rodzic chcę zobaczyć wiadomość, gdy filtry nie zwrócą żadnych wyników.

Kryteria akceptacji:

- Gdy nie ma wyników, wyświetla się komunikat: „Brak ofert spełniających Twoje kryteria"
- Pojawia się sugestia zmiany filtrów
- Opcja resetowania filtrów

#### US-014: Obsługa błędów – błąd sieci

Jako rodzic chcę dowiedzieć się, gdy aplikacja nie może załadować danych.

Kryteria akceptacji:

- Jeśli ładowanie mapy/listy się nie powiedzie, pojawia się komunikat błędu
- Przycisk do ponowienia ładowania
- Komunikat jest w jasnym, zrozumiałym języku

---

### 5.2 Historyjki – Organizator zajęć

#### US-015: Rejestracja organizatora

Jako organizator chcę stworzyć konto w aplikacji, aby móc dodawać swoje oferty.

Kryteria akceptacji:

- Formularz rejestracji zawiera pola: e-mail, hasło, potwierdzenie hasła, nazwa firmy/osoby, telefon
- Walidacja e-maila (format, czy nie istnieje już w bazie)
- Walidacja hasła (minimum 8 znaków, co najmniej 1 wielka litera, 1 cyfrę)
- Przycisk „Zarejestruj"
- Po rejestracji otrzymuję e-mail weryfikacyjny
- Po kliknięciu linku weryfikacyjnego konto jest aktywne
- Zostałem automatycznie zalogowany po weryfikacji

#### US-016: Logowanie organizatora

Jako organizator chcę zalogować się do aplikacji, aby dostać dostęp do mojego panelu.

Kryteria akceptacji:

- Strona logowania zawiera pola: e-mail, hasło
- Przycisk „Zaloguj się"
- Walidacja danych logowania (komunikat o błędzie, jeśli e-mail nie istnieje lub hasło jest złe)
- Po zalogowaniu się kieruję do panelu organizatora
- Sesja logowania trwa 30 minut, po czym muszę zalogować się ponownie

#### US-017: Resetowanie hasła

Jako organizator zapomniałem hasła i chcę je zresetować.

Kryteria akceptacji:

- Na stronie logowania jest link „Nie pamiętam hasła"
- Po kliknięciu mogę wpisać swój e-mail
- Otrzymuję e-mail z linkiem do resetowania hasła
- Link do resetowania jest ważny przez 1 godzinę
- Po kliknięciu mogę ustawić nowe hasło
- Nowe hasło spełnia wymagania (minimum 8 znaków, wielka litera, cyfra)

#### US-018: Edycja danych organizatora

Jako organizator chcę edytować moje dane (nazwa, telefon, e-mail), aby utrzymywać je aktualnym.

Kryteria akceptacji:

- W panelu organizatora jest sekcja „Moje dane"
- Mogę edytować: nazwę, telefon, e-mail
- Zmiana e-maila wymaga potwierdzenia (weryfikacja nowego e-maila)
- Przycisk „Zapisz zmiany"
- Potwierdzenie zapisania zmian

#### US-019: Dodawanie nowej oferty

Jako organizator chcę dodać nową ofertę, aby promować moje zajęcia.

Kryteria akceptacji:

- W panelu organizatora jest przycisk „Dodaj nową ofertę"
- Formularz zawiera pola: nazwa, opis, kategoria, typ, przedział wiekowy (od–do), termin (data początkowa, data końcowa), godziny (jeśli zajęcia cykliczne), lokalizacja (autocomplete Google Maps), liczba miejsc, zdjęcia
- Pola obowiązkowe: nazwa, opis, kategoria, typ, wiek, termin, lokalizacja
- Mogę dodać do 10 zdjęć
- Mogę zapisać ofertę jako „szkic" (bez publikacji) lub wysłać do moderacji
- Po wysłaniu do moderacji, oferta przechodzi do kolejki moderacyjnej (status: oczekiwanie)
- Otrzymuję e-mail z potwierdzeniem wysłania oferty do moderacji

#### US-020: Edycja istniejącej oferty

Jako organizator chcę edytować moją istniejącą ofertę, aby aktualizować informacje.

Kryteria akceptacji:

- Na liście moich ofert mogę kliknąć „Edytuj"
- Mogę edytować wszystkie pola oprócz daty utworzenia
- Po edycji mogę zapisać jako „szkic" lub wysłać do moderacji ponownie
- Jeśli oferta była już opublikowana, zmiana wymaga zatwierdzenia moderatora
- Historia zmian jest zapisywana (audyt)

#### US-021: Usuwanie oferty

Jako organizator chcę usunąć moją ofertę, która nie będzie się już odbywać.

Kryteria akceptacji:

- Na liście ofert mogę wybrać „Usuń"
- Pojawia się potwierdzenie: „Czy na pewno chcesz usunąć tę ofertę?"
- Po potwierdzeniu oferta jest usuwana
- Poprzednie zgłoszenia do oferty pozostają zapisane w bazie (dla sprawozdawczości)
- Otrzymuję e-mail z potwierdzeniem usunięcia

#### US-022: Podgląd oferty

Jako organizator chcę zobaczyć, jak moja oferta wygląda w aplikacji, zanim ją opublikuję.

Kryteria akceptacji:

- W formularzu dodawania/edycji oferty jest przycisk „Podgląd"
- Mogę zobaczyć ofertę tak, jak będzie wyświetlana w aplikacji (mobilnie i na desktopie)
- Mogę powrócić do edycji bez utraty danych

#### US-023: Archiwizacja oferty po upłynięciu terminu

Jako organizator chcę, aby moja oferta automatycznie przeszła do archiwum po dacie końcowej.

Kryteria akceptacji:

- Po upłynięciu daty końcowej oferta automatycznie zmienia status na „archiwalna"
- Archiwalne oferty nie są wyświetlane rodzicom (ani na mapie, ani na liście)
- Mogę nadal zobaczyć ofertę archiwalną w moim panelu (w osobnej zakładce)
- Mogę odaktywować ofertę zmienę datę końcową

#### US-024: Zarządzanie liczba dostępnych miejsc

Jako organizator chcę zaktualizować liczbę dostępnych miejsc, aby odzwierciedlić rzeczywistą sytuację.

Kryteria akceptacji:

- W panelu oferty mogę zmienić liczbę dostępnych miejsc
- Po osiągnięciu zera miejsc, status zmienia się na „pełne / brak miejsc"
- Oferta ze statusem „pełne" może być nadal widoczna, ale bez możliwości zgłoszenia
- Historia zmian liczby miejsc jest zapisywana

#### US-025: Powiadomienie o zgłoszeniu

Jako organizator chcę otrzymać powiadomienie e-mailem, gdy rodzic zgłosi dziecko na moje zajęcia.

Kryteria akceptacji:

- Po tym, jak rodzic wysyła formularz zgłoszenia, otrzymuję e-mail z danymi dziecka i rodzicem
- E-mail zawiera: imię dziecka, wiek, imię rodzica, e-mail, telefon, wiadomość (jeśli była)
- E-mail zawiera instrukcje, jak się odezwać do rodzicem
- Mogę zobaczyć historię zgłoszeń w panelu (opcjonalnie na MVP)

#### US-026: Filtrowanie moich ofert

Jako organizator chcę filtrować moje oferty po statusie (opublikowana, oczekiwanie, archiwalna), aby łatwo zarządzać.

Kryteria akceptacji:

- W panelu jest filtr statusu ofert
- Mogę wybrać: wszystkie, opublikowane, oczekiwanie, archiwalne
- Lista aktualizuje się natychmiast

#### US-027: Sortowanie moich ofert

Jako organizator chcę sortować moje oferty, aby łatwo znaleźć konkretną ofertę.

Kryteria akceptacji:

- Mogę sortować po: dacie utworzenia, dacie zmian, nazwie, terminie
- Sortuję rosnąco/malejąco
- Wybór sortowania jest pamiętany

#### US-028: Potwierdzenie utworzenia miejsca

Jako organizator chcę otrzymać e-mail z potwierdzeniem, że moja oferta została opublikowana.

Kryteria akceptacji:

- Po zatwierdzeniu oferty przez moderatora, otrzymuję e-mail z potwierdzeniem publikacji
- E-mail zawiera link do mojej oferty w aplikacji
- E-mail ma przyjazny ton i instrukcje dalszych kroków

---

### 5.3 Historyjki – Admin/Moderator

#### US-029: Podgląd kolejki moderacyjnej

Jako admin chcę zobaczyć listę ofert oczekujących na zatwierdzenie.

Kryteria akceptacji:

- W panelu admina jest zakładka „Kolejka moderacyjna"
- Wyświetlane są oferty w statusie „oczekiwanie"
- Każda oferta pokazuje: nazwę, organizatora, datę wysłania, podgląd
- Mogę kliknąć na ofertę, aby zobaczyć pełne szczegóły

#### US-030: Zatwierdzenie oferty

Jako admin chcę zatwierdzić ofertę i opublikować ją na platformie.

Kryteria akceptacji:

- Na stronie szczegółów oferty w panelu admina są przyciski: „Zatwierdź" i „Odrzuć"
- Po kliknięciu „Zatwierdź", oferta zmienia status na „opublikowana"
- Oferta pojawia się na mapie i liście
- Organizator otrzymuje e-mail z potwierdzeniem publikacji
- Historia zatwierdzeń jest zapisywana (kto, kiedy)

#### US-031: Odrzucenie oferty

Jako admin chcę odrzucić ofertę, jeśli nie spełnia kryteriów.

Kryteria akceptacji:

- Mogę wybrać przycisk „Odrzuć"
- Muszę wybrać powód odrzucenia (z listy predefiniowanych: niejasny opis, brakujące dane, spam, duplikat, itd.)
- Mogę dodać komentarz (opcjonalnie)
- Organizator otrzymuje e-mail z informacją o odrzuceniu i powodzie
- E-mail zawiera instrukcje, jak poprawić ofertę i wysłać ponownie
- Oferta pozostaje w panelu organizatora jako „odrzucona"

#### US-032: Walidacja obowiązkowych pól

Jako admin system automatycznie sprawdza, czy oferta zawiera wszystkie obowiązkowe pola.

Kryteria akceptacji:

- Walidacja obowiązkowych pól: nazwa, opis, kategoria, typ, wiek, termin, lokalizacja
- Jeśli pole brakuje, oferta nie może być opublikowana
- W interfejsie moderacyjnym wskazane są pola z błędem

#### US-033: Wykrywanie duplikatów

Jako admin chcę być ostrzegany o potencjalnych duplikatach (np. ta sama organizator, lokalizacja, termin).

Kryteria akceptacji:

- System automatycznie szuka ofert o podobnych: nazwie, lokalizacji, terminie, organizatorze
- Jeśli znalezione są potencjalne duplikaty, pojawia się ostrzeżenie
- Admin może zdecydować o złączeniu ofert (opóźnione na MVP) lub zatwierdzeniu obu

#### US-034: Automatyczne wygaszanie ofert po terminie

Jako system chcę automatycznie zmienić status ofert na „archiwalna" po upłynięciu daty końcowej.

Kryteria akceptacji:

- Każdego dnia o północy system sprawdza oferty
- Oferty z datą końcową < dzisiejsza zmieniana na status „archiwalna"
- Archiwalne oferty nie są wyświetlane rodzicom
- Historia zmian statusu jest zapisywana

#### US-035: Podgląd zgłoszeń (opcjonalnie na MVP)

Jako admin chcę zobaczyć historię zgłoszeń do ofert, dla celów monitorowania.

Kryteria akceptacji:

- W panelu admina jest zakładka „Zgłoszenia"
- Wyświetlane są wszystkie zgłoszenia (imię dziecka, rodzic, e-mail, data, oferta)
- Mogę filtrować po ofercie, dacie, organizatorze
- Mogę wyeksportować raport (CSV) – opcjonalnie

---

### 5.4 Historyjki – Bezpieczeństwo i Autentykacja

#### US-036: Bezpieczeństwo hasła

Jako system chcę przechowywać hasła w bezpieczny sposób.

Kryteria akceptacji:

- Hasła są hashowane za pośrednictwem bcrypt (lub podobnego algorytmu)
- Surowe hasła nigdy nie są przechowywane
- Reset hasła wymaga weryfikacji e-maila
- Hasła są wymuszane walidacją (minimum 8 znaków, wielka litera, cyfra)

#### US-037: Sesje użytkownika

Jako system chcę bezpiecznie zarządzać sesjami użytkowników.

Kryteria akceptacji:

- Sesja logowania trwa maksymalnie 30 minut nieaktywności
- Po upłynięciu sesji, użytkownik jest wylogowywany
- Użytkownik może wylogować się ręcznie (przycisk w panelu)
- Sesja jest przechowywana w bezpieczny sposób (HttpOnly cookies lub JWT)

#### US-038: Ochrona przed CSRF

Jako system chcę chronić formularz przed atakami CSRF.

Kryteria akceptacji:

- Każdy formularz zawiera CSRF token
- Token jest walidowany na serwerze przed przetworzeniem

#### US-039: Ochrona danych rodzica

Jako system chcę chronić dane osobowe rodziców (e-mail, telefon).

Kryteria akceptacji:

- Dane rodzicom nie są wyświetlane publicznie
- Dane są przechowywane szyfrowane w bazie
- Organizator widzi dane tylko w e-mailu z potwierdzeniem (nie w aplikacji na MVP)
- Regularna kopia zapasowa danych (plan post-MVP)

#### US-040: Logowanie operacji (audyt)

Jako system chcę rejestrować ważne operacje dla celów audytu.

Kryteria akceptacji:

- Logowane są: logowanie użytkownika, dodanie/edycja/usunięcie oferty, zatwierdzenie/odrzucenie oferty
- Dziennik zawiera: użytkownika, operację, datę/czas, IP (opcjonalnie)
- Dziennik jest dostępny adminowi
- Dziennik jest przechowywany przez co najmniej 30 dni

---

### 5.5 Historyjki – Analityka i Marketing

#### US-041: Śledzenie wizyt stron

Jako system chcę śledzić wizity na stronie za pośrednictwem Google Analytics 4.

Kryteria akceptacji:

- GA4 jest zainstalowany na wszystkich stronach
- Śledzony jest page_view dla każdej głównej strony
- Mogę widzieć ilość wizyt, bezpośrednich użytkowników, czas spędzony
- Dashboard GA4 jest skonfigurowany dla domyślnych raportów

#### US-042: Śledzenie interakcji na mapie

Jako system chcę śledzić, jak użytkownicy wchodzą w interakcję z mapą.

Kryteria akceptacji:

- Zdarzenie filter_apply: każdy zastosowany filtr
- Zdarzenie select_on_map: kliknięcie na marker na mapie
- Zdarzenie view_item: wyświetlenie szczegółów oferty
- Zdarzenie search: wyszukiwanie lokalizacji
- Parametry zdarzenia zawierają: filtr (kategoria/wiek/typ), lokalizację, typ oferty

#### US-043: Śledzenie zgłoszeń

Jako system chcę śledzić zgłoszenia do celów pomiarowy (pełna konwersja post-MVP, event tylko przygotować na MVP).

Kryteria akceptacji:

- Zdarzenie lead_submit: wysłanie formularz zgłoszenia
- Parametry: oferta ID, kategoria, wiek
- Event jest zarejestrowany w GA4
- KPI konwersji będzie aktywowany w post-MVP

#### US-044: Oznaczenie reklam Facebook Pixel

Jako system chcę integrować Facebook Pixel do śledzenia konwersji z reklam.

Kryteria akceptacji:

- Facebook Pixel jest zainstalowany (Post-MVP)
- UTM parametry są używane dla kampanii Facebook
- Mogę śledzić źródło ruchu z Facebook Ads

---

## 6. Metryki sukcesu

### 6.1 Główne KPI dla MVP

#### Hipoteza 1: Organizatorzy aktywnie dodają oferty

- Cel: 80–85% zarejestrowanych organizatorów doda przynajmniej jedną ofertę w ciągu 7 dni od rejestracji
- Pomiar: liczba rejestracji vs. liczba dodanych ofert w ciągu 7 dni
- Źródło: panel admina, dziennik zdarzeń

#### Hipoteza 2: Rodzice wyszukują zajęcia

- Cel: co najmniej 50 nowych ofert dodanych w pierwszym miesiącu
- Pomiar: liczba ofert status=opublikowana / miesiąc
- Cel: minimum 20 zgłoszeń/rezerwacji wysłanych przez rodziców w pierwszym miesiącu
- Pomiar: liczba lead_submit eventów / miesiąc

#### Hipoteza 3: Użytkownicy aktualnie korzystają z mapy i filtrów

- Pomiar: liczba wizyt na stronie
- Pomiar: liczba interakcji z mapą (filter_apply, select_on_map)
- Pomiar: liczba wyświetleń szczegółów oferty (view_item)
- Cel: potwierdzenie wzrostu wizyt week-over-week przez pierwsze 4 tygodnie

### 6.2 Metryki technicze

- Ładowanie mapy: < 3 sekundy
- Ładowanie szczegółów oferty: < 2 sekundy
- Dostępność aplikacji: 99.5%
- Page Speed Insights (Core Web Vitals): powyżej 90 dla mobile

### 6.3 Metryki zaangażowania użytkownika

- Bounce rate: < 50%
- Czas sesji: > 2 minuty
- Return rate: > 20% rodziców wróci w ciągu 7 dni
- Współczynnik konwersji (zgłoszenie / wyświetlenie szczegółów): > 5% – mierzony post-MVP

### 6.4 Metryki dostarczalności e-maili

- Open rate (Mailjet): > 20%
- Click rate: > 5%
- Bounce rate: < 2%
- Dostarczalność: 98%

### 6.5 Plan pomiarowy

- Tydzień 1–2: walidacja poprawności danych (ilość rejestracji, ilość wygenerowanych leadów, uptime)
- Tydzień 3–4: analiza ruchu i interakcji (filtry, kliknięcia na mapie, wyświetlenia szczegółów)
- Tydzień 5–6: wyciągnięcie wniosków i optymalizacje

---

## Nierozwiązane kwestie i obszary do doprecyzowania

1. Słownik kategorii/typów/przedziałów wieku – wymaga formalnego zatwierdzenia (np. lista 10–15 kategorii)
2. Strategia seedingu ofert na start – jak przygotować pierwsze ~50 ofert dla całej Polski
3. Dokładny zakres moderacji – które pola są obowiązkowe, limit czasu zatwierdzenia (SLA)
4. Szczegółowa konfiguracja GA4 – pełna lista eventów, parametry, dashboardy, momenty aktywacji KPI
5. Harmonogram redesignu UI/UX – dokładne specyfikacje designu (paleta barw, typografia, komponenty)
6. Plan migracji danych na post-MVP – jak obsługiwać import ofert ze źródeł zewnętrznych
