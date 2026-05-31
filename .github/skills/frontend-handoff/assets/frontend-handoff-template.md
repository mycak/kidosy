# Frontend handoff: [tytuł]

## Podsumowanie

- **Obszar:**
- **Typ zmiany:** additive | breaking | behavior-only | deprecation
- **Źródło backendowe:**
- **Wpływ na frontend:**

## Zmienione endpointy

| Status                | Method        | Path       | Auth              | Co się zmieniło |
| :-------------------- | :------------ | :--------- | :---------------- | :-------------- |
| Added/Changed/Removed | GET/POST/etc. | `/api/...` | Public/User/Admin | Krótki opis     |

## Utworzone lub zmienione typy

| Type / schema     | Source of truth                | Change            | Frontend impact after type generation |
| :---------------- | :----------------------------- | :---------------- | :------------------------------------ |
| `ExampleResponse` | serializer / schema / contract | Added field `foo` | UI musi obsłużyć `foo`                |

## Types diff

```diff
- type OldExampleResponse = {
-   id: string;
- }
+ type ExampleResponse = {
+   id: string;
+   foo?: string | null;
+ }
```

- Opisz dodane pola.
- Opisz usunięte pola.
- Opisz zmiany nullability / optional.
- Opisz zmiany semantyczne lub rename'y.
- Jeśli diff jest przybliżony, zaznacz założenia.

## Przykłady requestów

### `<METHOD> <PATH>`

#### Przykładowy request

```json
{}
```

## Przykłady response'ów

### Sukces

```json
{}
```

### Przykład błędu / walidacji / braku uprawnień

```json
{}
```

## Szczegóły zachowania

- Zasady walidacji:
- Nullability / pola opcjonalne:
- Paginacja / kursory / sortowanie:
- Uprawnienia / różnice między rolami:
- Feature flagi / różnice środowiskowe:

## Edge case'y

- Empty state:
- Partial data:
- Race conditions / stale cache:
- Retry / timeout behavior:
- Backward compatibility:
- Inne:

## Notatki implementacyjne dla frontendu

### Next.js / React

- Wpływ na route lub stronę:
- Stany loading / error / empty:
- Uwagi dot. SSR / CSR:

### TanStack Query

- Sugerowane query keys:
- Zasady invalidacji:
- Skutki uboczne mutacji:
- Uwagi do optimistic update:

### Zustand

- Zmieniane slice'y store'a:
- Derived flags lub selektory:
- Uwagi do resetu / persystencji:

## Action items dla frontendu

- [ ] Wygenerować ponownie typy API
- [ ] Zaktualizować hooki do pobierania danych
- [ ] Zaktualizować stany loading / empty / error w UI
- [ ] Zaktualizować logikę store'a, jeśli potrzeba
- [ ] Dodać lub zaktualizować testy

## Metadane

- **Lokalizacja pliku:** `docs/handoffs/YYYY-MM-DD-<topic>-frontend-handoff.md`
- **Język dokumentu:** Polski

## Otwarte pytania / założenia

-
