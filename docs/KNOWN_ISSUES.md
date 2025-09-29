# Known Issues & Limitations

**Last Updated:** September 29, 2025
**Project Version:** 1.0.0

---

## ⚠️ Critical Limitations

### 1. **Over React Components Not Converted**

**Status:** ❌ Not Implemented

Over React uses a completely different syntax than React:
- `Dom.div()..className = 'foo')(children)` cascade notation
- Component factories with `@Factory()`, `@Props()`, `@Component()` decorators
- Props as classes instead of interfaces

**Current Behavior:** Over React syntax remains in output, causing TypeScript errors.

**Workaround:** Manually convert Over React components to React function components with hooks.

**Example:**
```dart
// Dart (Over React)
@Component()
class UserCardComponent extends UiComponent<UserCardProps> {
  render() {
    return Dom.div()..className = 'card')(
      Dom.h3()(props.user.name)
    );
  }
}
```

**Needs manual conversion to:**
```typescript
const UserCard: React.FC<UserCardProps> = ({ user }) => {
  return (
    <div className="card">
      <h3>{user.name}</h3>
    </div>
  );
};
```

---


### 2. **Some Factory Constructors Remain**

**Status:** ⚠️ Partially Fixed

While most factory constructors are removed, some edge cases with complex syntax may slip through.

**Example of what gets missed:**
```dart
factory User([void Function(UserBuilder)? updates]) = _$User;
```

**Workaround:** Search output for `factory` keyword and remove manually.

---

### 3. **Cascade Notation Not Supported**

**Status:** ❌ Not Implemented

Dart's cascade operator (`..`) has no TypeScript equivalent and is not converted.

**Example:**
```dart
Dom.div()
  ..className = 'foo'
  ..onClick = handleClick
)('content')
```

**Remains as-is in output**, causing syntax errors.

**Workaround:** Manually convert to JSX or React.createElement calls.

---

### 4. **Getter/Setter Syntax Partially Converted**

**Status:** ⚠️ Partially Fixed

Simple getters like `string get name;` convert to `readonly name: string`.

**However:**
- Getters with logic (`get name => _name`) have mixed conversion
- Setters not handled at all
- Computed properties need manual attention

---

### 5. **String Interpolation in Complex Expressions**

**Status:** ⚠️ Partially Fixed

Simple interpolation converts: `'Hello $name'` → `` `Hello ${name}` ``

**Not handled:**
- Multi-line strings with interpolation
- Nested interpolation
- Interpolation within object literals
- Mixed quotes with escapes

---

### 6. **No AST Parsing**

**Status:** ❌ Fundamental Limitation

The converter uses regex-based transformations, which cannot understand:
- Code structure and context
- Scope and variable binding
- Expression precedence
- Type inference

**Impact:** ~30-40% of converted code requires manual fixes for subtle syntax errors.

---

## 🔧 Minor Issues

### 7. **Type Inference Not Supported**

Dart's `var` with type inference becomes `let` in TypeScript, but explicit type annotations are not added.

**Example:**
```dart
var count = 0; // Dart infers int
```

Converts to:
```typescript
let count = 0; // TypeScript infers number (works)
```

But for complex types:
```dart
var user = getUser(); // Returns User
```

Converts to:
```typescript
let user = getUser(); // Type inference may fail
```

**Workaround:** Add explicit type annotations manually where needed.

---

### 8. **Extension Methods**

**Status:** ❌ No TypeScript Equivalent

Dart extension methods have no direct TypeScript equivalent.

**Example:**
```dart
extension StringExtensions on String {
  String get reversed => split('').reversed.join('');
}
```

**Workaround:** Convert to utility functions or add to prototype (not recommended).

---

### 9. **Named Parameters**

**Status:** ⚠️ Basic Support Only

Dart named parameters (`{required String name}`) are not properly converted to TypeScript destructuring.

**Example:**
```dart
void greet({required String name, int? age}) {
  print('Hello $name');
}
```

**Current output:**
```typescript
void greet({required string name, number | null age}) {
  print(`Hello ${name}`);
}
```

**Should be:**
```typescript
function greet({ name, age }: { name: string; age?: number }) {
  console.log(`Hello ${name}`);
}
```

---

### 10. **Mixins**

**Status:** ⚠️ Converted to Comments

Dart mixins become comments:
```dart
class Foo extends Bar with Mixin { }
```

Converts to:
```typescript
class Foo extends Bar /* mixins: Mixin */ { }
```

**Workaround:** Refactor to use composition or inheritance manually.

---

### 11. **Part Files**

**Status:** ✅ Removed

`part 'file.g.dart'` directives are now stripped from output.

However, generated files (`.g.dart`) are not converted, as they're build artifacts.

---

### 12. **Async Generators**

**Status:** ❌ Incorrect Conversion

`async*` converts to `async function*` which has different semantics.

Dart `async*` yields futures, while TypeScript async generators yield values directly.

**Workaround:** Manually implement using async iterators or observables.

---

### 13. **Private Members**

**Status:** ⚠️ Underscore Preserved

Dart's `_privateMember` convention is preserved, but TypeScript privacy is different.

**Recommendation:** Convert to TypeScript `private` keyword or `#privateField` syntax manually.

---

### 14. **DateTime Operations**

**Status:** ⚠️ Type Converted Only

`DateTime` converts to `Date`, but Dart's DateTime API is different from JavaScript's Date API.

**Example:**
```dart
final tomorrow = DateTime.now().add(Duration(days: 1));
```

Converts to:
```typescript
const tomorrow = Date.now().add(Duration(days: 1));
```

**But `Date.now()` returns a number, not a Date object.**

**Workaround:** Use `date-fns` or `dayjs` and manually convert Date operations.

---

## 📝 Best Practices

### Before Converting

1. **Clean up your Dart code first**
   - Remove dead code
   - Simplify complex expressions
   - Extract utilities to separate files

2. **Document custom patterns**
   - Note any project-specific conventions
   - Document framework usage

3. **Run Dart analyzer**
   - Fix all warnings
   - Ensure code compiles cleanly

### After Converting

1. **Review ALL generated code**
   - Do not assume conversion is correct
   - Pay special attention to:
     - Component definitions
     - State management
     - HTTP calls
     - Date operations

2. **Run TypeScript compiler**
   ```bash
   npx tsc --noEmit output/**/*.ts
   ```

3. **Test incrementally**
   - Convert small modules first
   - Test each module before moving on
   - Maintain a mixed codebase during migration

4. **Use ESLint**
   - Catch common issues
   - Enforce TypeScript best practices

---

## 🚀 Recommended Migration Strategy

### Phase 1: Foundation (Week 1)
1. Convert type definitions first (interfaces, types)
2. Convert utility functions
3. Set up TypeScript build tooling

### Phase 2: Core Logic (Weeks 2-3)
1. Convert business logic classes
2. Convert state management
3. Write tests for converted code

### Phase 3: UI Components (Weeks 4-6)
1. Manually convert Over React components
2. Test each component individually
3. Integrate with converted state management

### Phase 4: Integration (Week 7)
1. Wire everything together
2. End-to-end testing
3. Performance optimization

### Phase 5: Cleanup (Week 8)
1. Remove Dart code
2. Update documentation
3. Team training

---

## 📊 Estimated Manual Effort

Based on testing with a 200-line example file:

| Task | Time Estimate |
|------|---------------|
| Fix imports | 5-10 minutes |
| Convert interfaces | 15-20 minutes |
| Convert Over React components | 45-90 minutes |
| Fix state management | 30-45 minutes |
| Test and debug | 60-120 minutes |
| **Total per 200 lines** | **2.5-4.5 hours** |

**Scaling factors:**
- Simple utilities: 1x
- Business logic: 1.5x
- UI components: 3x
- Complex state management: 4x

---

## 🆘 Getting Help

### If You Encounter Issues

1. **Check this file first** - Most issues are documented here
2. **Check generated reports** - See `decisions/` directory
3. **Run TypeScript compiler** - Get specific error messages
4. **Search output for keywords**:
   - `factory` - Factory constructors not removed
   - `..` - Cascade notation not converted
   - `Dom.` - Over React not converted
   - `_$` - Generated code references not removed

### Reporting New Issues

When reporting issues, include:
1. Dart input code (minimum reproducible example)
2. TypeScript output code
3. Expected TypeScript code
4. Converter version
5. Command used to run converter

---

## 🔮 Future Improvements

**Planned for v2.0:**
- AST-based parsing for semantic understanding
- Over React → React conversion
- Flux → Redux Toolkit conversion
- Interactive mode with user guidance
- Incremental migration support

**Would like to have:**
- Machine learning for pattern recognition
- Custom transformation rules
- Plugin system for project-specific patterns
- Integration with IDE/editor

---

**Remember:** This tool is a starting point, not a complete solution. Budget for significant manual work in your migration timeline.