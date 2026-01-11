# GitLab MCP Review - Format

## Proces

1. `save_review_file` → `.gitlab_review/mr-{iid}-review.md` (auto .gitignore)
2. Edytuj plik: zmień `[ACCEPT=true/false]` przy komentarzach
3. `publish_review_comments` → wysyła `ACCEPT=true` do GitLab jako inline comments

## Lokalizacja

```
<workspace>/.gitlab_review/mr-{iid}-review.md
```

Katalog auto-dodany do `.gitignore`

## Struktura pliku

```markdown
# Code Review: MR !{iid}

**Projekt:** {project_id} | **Autor:** {author} | **Status:** {state}

---

## Ogólne uwagi do MR

REVIEW_COMMENT: Merge request nie zawiera testów jednostkowych [ACCEPT=true]
REVIEW_COMMENT: Brak aktualizacji dokumentacji [ACCEPT=false]

---

## 📄 {file_path}

\`\`\`diff
@@ -10,7 +10,8 @@
   public class Example {
-    private static final String abc = "JON";
REVIEW_COMMENT: Nieprawidłowa kolejność modyfikatorów [ACCEPT=true] LINE:15
REVIEW_COMMENT: Pola statyczne notujemy WIELKIMI_LITERAMI [ACCEPT=true] LINE:15
+    final private static String abc = "JON";
   }
\`\`\`

---
```

## Format komentarza

### Komentarz ogólny (bez linii)
```
REVIEW_COMMENT: Treść komentarza [ACCEPT=true]
```

### Komentarz do konkretnej linii
```
REVIEW_COMMENT: Treść komentarza [ACCEPT=true] LINE:42
```

### Komentarz do starej linii (usuniętej)
```
REVIEW_COMMENT: Treść komentarza [ACCEPT=true] LINE:42 TYPE:old
```

## Zasady

- **REVIEW_COMMENT:** - prefix (WIELKIE LITERY)
- **Treść** - dowolny tekst, może zawierać Markdown
- **[ACCEPT=true]** - wysyłaj do GitLab
- **[ACCEPT=false]** - pomiń, nie wysyłaj
- **LINE:X** - opcjonalnie numer linii (dla inline comment)
- **TYPE:old** - opcjonalnie typ linii (domyślnie `new`)

**Domyślnie:** `ACCEPT=true` - jeśli nie podano, komentarz zostanie wysłany

## Przykłady

### Ogólne uwagi bez linii

```markdown
## Ogólne uwagi do MR

REVIEW_COMMENT: Brak testów jednostkowych dla nowych funkcji [ACCEPT=true]
REVIEW_COMMENT: Dokumentacja wymaga aktualizacji [ACCEPT=true]
REVIEW_COMMENT: To jest draft, nie wysyłaj [ACCEPT=false]
```

Te komentarze trafią jako ogólne uwagi do MR (nie inline).

### Komentarze inline do konkretnych linii

```markdown
## 📄 src/User.java

\`\`\`diff
@@ -10,7 +10,8 @@
   public class User {
-    private static final String role = "ADMIN";
REVIEW_COMMENT: Nieprawidłowa kolejność modyfikatorów [ACCEPT=true] LINE:15
REVIEW_COMMENT: Pola statyczne notujemy WIELKIMI_LITERAMI [ACCEPT=true] LINE:15
+    final private static String role = "ADMIN";
   }
\`\`\`
```

### Komentarz do usuniętej linii

```markdown
REVIEW_COMMENT: Dlaczego usunięto tę konfigurację? [ACCEPT=true] LINE:80 TYPE:old

\`\`\`diff
@@ -78,3 +78,2 @@
   config = {
-    timeout: 5000,
   }
\`\`\`
```

### Draft (nie wysyłaj)

```markdown
REVIEW_COMMENT: TODO: sprawdzić z team leadem [ACCEPT=false] LINE:100
```

### Komentarz z kodem

```markdown
## 📄 src/api.ts

\`\`\`diff
@@ -100,2 +100,3 @@
   async function process() {
REVIEW_COMMENT: Użyj try-catch zamiast .then().catch() [ACCEPT=true] LINE:42
+    return await fetchData();
   }
\`\`\`

Sugerowana poprawka:
\`\`\`typescript
try {
  const data = await fetchData();
} catch (error) {
  logger.error('Failed', error);
}
\`\`\`
```

## Workflow

**Automatyczny:**
1. "Pobierz diff z MR 42 projektu X do review"
2. AI analizuje → dodaje `REVIEW_COMMENT:` z `[ACCEPT=true]`
3. Przeglądasz → zmieniasz na `[ACCEPT=false]` jeśli nie chcesz wysłać
4. "Wyślij zaakceptowane komentarze do GitLab"

**Ręczny:**
1. "Pobierz diff z MR 42 do pliku"
2. Ręcznie dodajesz `REVIEW_COMMENT:` nad problematycznymi liniami
3. "Wyślij komentarze z .gitlab_review/mr-42-review.md"

## Parser

Parser szuka wzorca:
```regex
REVIEW_COMMENT:\s*(.+?)\s*\[ACCEPT=(true|false)\](?:\s+LINE:(\d+))?(?:\s+TYPE:(old|new))?
```

- Wyciąga treść komentarza
- Sprawdza flagę ACCEPT
- Opcjonalnie: numer linii (LINE:X)
- Opcjonalnie: typ linii (TYPE:old/new, domyślnie new)

## Częste błędy

❌ Małe litery: `review_comment:` → ✅ `REVIEW_COMMENT:`
❌ Brak nawiasów: `ACCEPT=true` → ✅ `[ACCEPT=true]`
❌ Zły typ: `[ACCEPT=yes]` → ✅ `[ACCEPT=true]` lub `[ACCEPT=false]`
❌ Spacja: `REVIEW_COMMENT :` → ✅ `REVIEW_COMMENT:`
❌ Linia poza diff → sprawdź numery w diff

## Statystyki

Po publikacji:
```json
{
  "published": 5,   // wysłane (ACCEPT=true)
  "skipped": 2,     // pominięte (ACCEPT=false)
  "errors": 0       // błędy API
}
```

