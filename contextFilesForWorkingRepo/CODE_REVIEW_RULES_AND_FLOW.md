# GitLab Code Review - Format i Workflow

## 🎯 Narzędzia MCP

Server udostępnia 7 narzędzi do code review GitLab MR:

1. **get_merge_request** - pobiera szczegóły MR (title, author, state)
2. **get_merge_request_diff** - pobiera diff z wszystkimi zmianami
3. **post_merge_request_comment** - dodaje ogólny komentarz do MR
4. **post_merge_request_inline_comment** - dodaje komentarz do konkretnej linii
5. **post_merge_request_inline_comments_batch** - dodaje wiele komentarzy naraz
6. **save_review_file** - tworzy plik review z diffem
7. **publish_review_comments** - wysyła zaakceptowane komentarze do GitLab

---

## 📋 Workflow

### Krok 1: Pobierz diff i stwórz plik review

**Prompt:**
```
"Pobierz diff z MR 42 projektu group/project do review (workspace: /Users/user/project)"
```

**Akcja:**
- Tworzy `.gitlab_review/mr-42-review.md` (auto dodaje do .gitignore)
- Pobiera diff z GitLab
- Przygotowuje strukturę pliku

### Krok 2: AI analizuje i dodaje uwagi

**Prompt:**
```
"Przeanalizuj plik .gitlab_review/mr-42-review.md i dodaj uwagi code review"
```

**Akcja AI:**
- Otwiera plik review
- Analizuje każdy plik w diff
- Dodaje `REVIEW_COMMENT:` z `[ACCEPT=true]` nad problematycznymi liniami
- Dodaje ocenę ogólną na górze (✅ OK / ⚠️ WYMAGA POPRAWEK / ❌ ODRZUĆ)
- Zapisuje plik

### Krok 3: Weryfikacja przez użytkownika

- Otwierasz `.gitlab_review/mr-42-review.md`
- Czytasz uwagi AI
- Zmieniasz `[ACCEPT=false]` dla komentarzy które nie chcesz wysłać
- Edytujesz treść jeśli potrzeba

### Krok 4: Wyślij zaakceptowane uwagi

**Prompt:**
```
"Wyślij komentarze z .gitlab_review/mr-42-review.md do GitLab"
```

**Akcja:**
- Parser znajduje wszystkie `REVIEW_COMMENT:` z `[ACCEPT=true]`
- Wysyła komentarze inline (z LINE:X) lub ogólne (bez LINE)
- Zwraca statystyki: published, skipped, errors

---

## 📄 Format pliku review

### Struktura

```markdown
# Code Review: MR !42

**Projekt:** group/project | **Autor:** Jan Kowalski | **Status:** opened

---

## ⚠️ OCENA: WYMAGA POPRAWEK

Główne problemy:
- Brak testów jednostkowych
- Security issues w 2 miejscach
- Hardcoded credentials

---

## Ogólne uwagi do MR

REVIEW_COMMENT: Merge request nie zawiera testów jednostkowych [ACCEPT=true]
REVIEW_COMMENT: Brak aktualizacji dokumentacji [ACCEPT=false]

---

## 📄 src/User.java

\`\`\`diff
@@ -10,7 +10,8 @@
   public class User {
-    private static final String role = "ADMIN";
REVIEW_COMMENT: Nieprawidłowa kolejność modyfikatorów [ACCEPT=true] LINE:15
REVIEW_COMMENT: Pola statyczne WIELKIMI_LITERAMI [ACCEPT=true] LINE:15
+    final private static String role = "ADMIN";
   }
\`\`\`

---

## 📄 src/api.ts

\`\`\`diff
@@ -100,2 +100,3 @@
   async function process() {
REVIEW_COMMENT: Brakuje error handlingu - użyj try-catch [ACCEPT=true] LINE:102
+    return await fetchData();
   }
\`\`\`

---
```

### Oceny ogólne (na górze pliku)

AI dodaje jedną z ocen:

**✅ OK - Można mergować**
```markdown
## ✅ OCENA: OK

Kod jest dobrej jakości. Drobne uwagi poniżej, ale nic krytycznego.
```

**⚠️ WYMAGA POPRAWEK**
```markdown
## ⚠️ OCENA: WYMAGA POPRAWEK

Główne problemy:
- Security issue w src/api.ts:102
- Brak walidacji w src/utils.ts:50
```

**❌ ODRZUĆ**
```markdown
## ❌ OCENA: ODRZUĆ

Krytyczne problemy uniemożliwiające merge:
- Hardcoded credentials w src/config.ts:25
- SQL injection vulnerability w src/db.ts:100
- Brak testów dla critical path
```

---

## 🏷️ Format komentarza

### Komentarz ogólny (nie do konkretnej linii)

```
REVIEW_COMMENT: Treść komentarza [ACCEPT=true]
```

Umieszczany w sekcji "Ogólne uwagi do MR" PRZED diffami.

### Komentarz inline (do konkretnej linii)

```
REVIEW_COMMENT: Treść komentarza [ACCEPT=true] LINE:42
```

Umieszczany WEWNĄTRZ bloku diff, NAD problematyczną linią.

### Komentarz do usuniętej linii

```
REVIEW_COMMENT: Dlaczego usunięto? [ACCEPT=true] LINE:80 TYPE:old
```

### Składnia

- **REVIEW_COMMENT:** - prefix (WIELKIE LITERY, obowiązkowo)
- **Treść** - dowolny tekst, może zawierać Markdown
- **[ACCEPT=true]** - wyślij do GitLab
- **[ACCEPT=false]** - pomiń, nie wysyłaj
- **LINE:42** - numer linii (opcjonalnie, dla inline)
- **TYPE:old** - typ linii: old/new (opcjonalnie, domyślnie new)

---

## 📊 Przykłady

### Pełny przykład z oceną

```markdown
# Code Review: MR !42

**Projekt:** backend/api | **Autor:** jkowalski | **Status:** opened

---

## ⚠️ OCENA: WYMAGA POPRAWEK

Główne problemy:
- Brak error handlingu w 3 miejscach
- Hardcoded API key w src/config.ts
- Brak testów

---

## Ogólne uwagi do MR

REVIEW_COMMENT: Brak testów jednostkowych dla nowych funkcji [ACCEPT=true]
REVIEW_COMMENT: Dokumentacja API wymaga aktualizacji [ACCEPT=true]
REVIEW_COMMENT: Nie wszystkie pliki mają proper formatting [ACCEPT=false]

---

## 📄 src/api.ts

\`\`\`diff
@@ -50,2 +50,4 @@
   async function fetchUser(id: string) {
REVIEW_COMMENT: Brakuje walidacji parametru id (może być null/undefined) [ACCEPT=true] LINE:51
REVIEW_COMMENT: Dodaj try-catch dla error handlingu [ACCEPT=true] LINE:52
+    const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
+    return user;
   }
\`\`\`

---

## 📄 src/config.ts

\`\`\`diff
@@ -10,1 +10,2 @@
   export const config = {
REVIEW_COMMENT: KRYTYCZNE: Hardcoded API key - użyj zmiennych środowiskowych [ACCEPT=true] LINE:11
+    apiKey: "sk_live_abc123xyz",
   };
\`\`\`

---
```

### Przykład OK (można mergować)

```markdown
# Code Review: MR !43

**Projekt:** frontend/ui | **Autor:** akowalska | **Status:** opened

---

## ✅ OCENA: OK

Kod wygląda dobrze. Drobne sugestie poniżej, ale można mergować.

---

## Ogólne uwagi do MR

REVIEW_COMMENT: Świetna refaktoryzacja! Kod jest czytelniejszy [ACCEPT=true]

---

## 📄 src/components/Button.tsx

\`\`\`diff
@@ -20,3 +20,5 @@
   export const Button = ({ label, onClick }) => {
REVIEW_COMMENT: Dobry pomysł - accessibility poprawione ✅ [ACCEPT=false]
+    return <button onClick={onClick} aria-label={label}>{label}</button>;
   };
\`\`\`

---
```

---

## 🚀 Szybki workflow (batch)

Zamiast pojedynczych komentarzy, AI może wysłać wszystkie naraz:

**Prompt:**
```
"Dodaj do MR 42 komentarze:
- src/api.ts:102 - brak error handlingu
- src/utils.ts:50 - security issue XSS
- src/config.ts:25 - hardcoded value"
```

AI wywołuje `post_merge_request_inline_comments_batch` z JSON:
```json
{
  "project_id": "group/project",
  "mr_iid": 42,
  "comments": [
    {"body": "Brak error handlingu", "file_path": "src/api.ts", "line_number": 102},
    {"body": "Security issue XSS", "file_path": "src/utils.ts", "line_number": 50},
    {"body": "Hardcoded value", "file_path": "src/config.ts", "line_number": 25}
  ]
}
```

Wszystkie 3 komentarze wysłane jednocześnie! ✅

---

## 🎯 Best Practices dla AI

### Ocena jakości MR

**Zawsze dodaj ocenę na górze:**
- ✅ **OK** - brak krytycznych problemów, może być 1-2 drobne uwagi
- ⚠️ **WYMAGA POPRAWEK** - są problemy do naprawienia (3-10 uwag)
- ❌ **ODRZUĆ** - krytyczne problemy (security, breaking changes, brak testów dla critical)

### Komentarze ogólne

Dodaj przed diffami dla:
- Brak testów
- Brak dokumentacji
- Ogólne architektoniczne uwagi
- Podsumowanie problemów

### Komentarze inline

Dodaj WEWNĄTRZ diffa, NAD linią dla:
- Błędy w kodzie
- Security issues
- Performance problems
- Code smells
- Style violations

### Priorytety

**KRYTYCZNE (zawsze ACCEPT=true):**
- Security vulnerabilities
- Breaking changes bez migracji
- Data loss risks
- Hardcoded credentials

**WAŻNE (zazwyczaj ACCEPT=true):**
- Brak error handlingu
- Brak walidacji
- Memory leaks
- Performance issues

**NICE TO HAVE (może być ACCEPT=false):**
- Style improvements
- Refactoring suggestions
- Minor optimizations

---

## 📈 Statystyki publikacji

Po wysłaniu otrzymasz:
```json
{
  "published": 5,
  "skipped": 2,
  "errors": 0
}
```

- **published**: wysłane do GitLab (ACCEPT=true)
- **skipped**: pominięte (ACCEPT=false)
- **errors**: błędy podczas wysyłania

---

## ⚠️ Częste błędy

❌ `review_comment:` → ✅ `REVIEW_COMMENT:` (wielkie litery!)
❌ `ACCEPT=true` → ✅ `[ACCEPT=true]` (nawiasy!)
❌ `[ACCEPT=yes]` → ✅ `[ACCEPT=true]` lub `[ACCEPT=false]`
❌ Komentarz przed blokiem diff → ✅ Komentarz WEWNĄTRZ diffa nad linią
❌ LINE:999 (nie ma w diff) → ✅ Sprawdź numery linii w diff

---

## 🔄 Lokalizacja plików

```
<workspace>/
  .gitlab_review/          (auto w .gitignore)
    mr-42-review.md        (plik review z diffem i uwagami)
```

---

**TL;DR:** Pobierz diff → AI analizuje i dodaje uwagi z oceną → Weryfikujesz → Wysyłasz do GitLab

