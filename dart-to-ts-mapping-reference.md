# Dart to TypeScript/React Mapping Reference

## Quick Reference Guide

This document provides comprehensive mapping tables and patterns for converting Dart web applications to React 18 + TypeScript. Use this as a reference during conversion.

## Type Mappings

### Core Types

| Dart Type   | TypeScript Type               | Notes                           |
| ----------- | ----------------------------- | ------------------------------- |
| `int`       | `number`                      | No separate integer type        |
| `double`    | `number`                      | All numbers are float64         |
| `num`       | `number`                      | Base numeric type               |
| `String`    | `string`                      | Lowercase in TS                 |
| `bool`      | `boolean`                     | Lowercase in TS                 |
| `List<T>`   | `T[]` or `Array<T>`           | Prefer `T[]` syntax             |
| `Set<T>`    | `Set<T>`                      | Native ES6 Set                  |
| `Map<K, V>` | `Map<K, V>` or `Record<K, V>` | Use Record for object-like maps |
| `dynamic`   | `any`                         | Avoid when possible             |
| `Object`    | `object` or `unknown`         | Prefer `unknown` for safety     |
| `void`      | `void`                        | Same concept                    |
| `Never`     | `never`                       | Unreachable code                |
| `Null`      | `null`                        | Explicit null                   |

### Nullability

| Dart Pattern   | TypeScript Pattern       | Example                       |
| -------------- | ------------------------ | ----------------------------- |
| `T?`           | `T \| null \| undefined` | `string \| null \| undefined` |
| `T` (non-null) | `T`                      | `string`                      |
| `late T`       | `T` with runtime check   | Assert non-null before use    |
| `T??` fallback | `T ?? fallback`          | Nullish coalescing            |

### Async Types

| Dart Type             | TypeScript Type     | Usage                |
| --------------------- | ------------------- | -------------------- |
| `Future<T>`           | `Promise<T>`        | Async operations     |
| `FutureOr<T>`         | `T \| Promise<T>`   | Sync or async result |
| `Stream<T>`           | `Observable<T>`     | Requires RxJS        |
| `StreamController<T>` | `Subject<T>`        | RxJS Subject         |
| `StreamSubscription`  | `Subscription`      | RxJS Subscription    |
| `async*` generator    | `AsyncGenerator<T>` | Async iteration      |
| `yield`               | `yield`             | Generator syntax     |
| `await for`           | `for await...of`    | Async iteration      |

### Collections & Iterables

| Dart Pattern      | TypeScript Pattern | Example         |
| ----------------- | ------------------ | --------------- |
| `Iterable<T>`     | `Iterable<T>`      | ES6 Iterable    |
| `Iterator<T>`     | `Iterator<T>`      | ES6 Iterator    |
| `List.generate()` | `Array.from()`     | Array creation  |
| `List.filled()`   | `Array(n).fill()`  | Filled array    |
| `[...list]`       | `[...array]`       | Spread operator |
| `list.map()`      | `array.map()`      | Transformation  |
| `list.where()`    | `array.filter()`   | Filtering       |
| `list.fold()`     | `array.reduce()`   | Reduction       |
| `list.expand()`   | `array.flatMap()`  | Flat mapping    |

## Widget to Component Mappings

### Core Widgets

| Flutter Widget           | React Component            | Implementation                |
| ------------------------ | -------------------------- | ----------------------------- |
| `StatelessWidget`        | `React.FC`                 | Functional component          |
| `StatefulWidget`         | `React.FC` with hooks      | useState, useEffect           |
| `InheritedWidget`        | `Context.Provider`         | React Context API             |
| `StreamBuilder`          | `useQuery` (RTK Query)     | Or custom hook with useEffect |
| `FutureBuilder`          | `Suspense` + `useQuery`    | React 18 Suspense             |
| `AnimatedBuilder`        | `useSpring` (react-spring) | Animation library             |
| `LayoutBuilder`          | `useResizeObserver`        | Custom hook                   |
| `ValueListenableBuilder` | `useState` + `useEffect`   | State subscription            |

### Layout Widgets

| Flutter Widget | React/CSS Solution            | Notes                      |
| -------------- | ----------------------------- | -------------------------- |
| `Container`    | `<div>` with styles           | Flexbox/Grid               |
| `Row`          | `display: flex`               | `flex-direction: row`      |
| `Column`       | `display: flex`               | `flex-direction: column`   |
| `Stack`        | `position: relative/absolute` | Layered positioning        |
| `Positioned`   | `position: absolute`          | With top/left/right/bottom |
| `Expanded`     | `flex: 1`                     | Flex grow                  |
| `Flexible`     | `flex: 0 1 auto`              | Flex shrink                |
| `SizedBox`     | Fixed width/height div        | Spacer component           |
| `Padding`      | `padding` CSS                 | Wrapper div                |
| `Center`       | `display: flex` + center      | Flexbox centering          |
| `Align`        | `display: flex` + alignment   | Flexbox alignment          |

### Input Widgets

| Flutter Widget   | React Component           | Library             |
| ---------------- | ------------------------- | ------------------- |
| `TextField`      | `<input>`                 | Native HTML         |
| `TextFormField`  | React Hook Form field     | react-hook-form     |
| `Checkbox`       | `<input type="checkbox">` | Or MUI Checkbox     |
| `Radio`          | `<input type="radio">`    | Or MUI Radio        |
| `Switch`         | MUI Switch                | @mui/material       |
| `Slider`         | `<input type="range">`    | Or MUI Slider       |
| `DropdownButton` | `<select>`                | Or MUI Select       |
| `DatePicker`     | MUI DatePicker            | @mui/x-date-pickers |
| `Form`           | `<form>` with RHF         | react-hook-form     |

### Navigation Widgets

| Flutter Pattern       | React Pattern   | Implementation   |
| --------------------- | --------------- | ---------------- |
| `Navigator.push()`    | `navigate()`    | React Router v6  |
| `Navigator.pop()`     | `navigate(-1)`  | Go back          |
| `MaterialPageRoute`   | `<Route>`       | Route component  |
| `BottomNavigationBar` | Tab navigation  | Custom or MUI    |
| `Drawer`              | MUI Drawer      | Slide-out menu   |
| `AppBar`              | MUI AppBar      | Header component |
| `TabBar`              | MUI Tabs        | Tab navigation   |
| `PageView`            | Swiper/Carousel | External library |

## State Management Patterns

### Provider to Redux Toolkit

| Provider Pattern | RTK Pattern        | Notes            |
| ---------------- | ------------------ | ---------------- |
| `ChangeNotifier` | Redux Slice        | createSlice      |
| `Provider.of()`  | `useSelector()`    | Select state     |
| `context.read()` | `useDispatch()`    | Dispatch actions |
| `MultiProvider`  | `configureStore`   | Combine reducers |
| `ProxyProvider`  | Computed selectors | createSelector   |
| `StreamProvider` | RTK Query          | Async data       |
| `FutureProvider` | RTK Query          | One-time fetch   |

### Riverpod to RTK Query

| Riverpod Pattern        | RTK Query Pattern   | Implementation      |
| ----------------------- | ------------------- | ------------------- |
| `Provider`              | Selector            | Pure computed value |
| `StateProvider`         | Slice state         | Simple state        |
| `FutureProvider`        | Query endpoint      | API call            |
| `StreamProvider`        | Query with polling  | Real-time data      |
| `StateNotifierProvider` | Slice with reducers | Complex state       |
| `ref.watch()`           | `useSelector()`     | Subscribe to state  |
| `ref.read()`            | `store.getState()`  | One-time read       |

### BLoC to Redux Toolkit

| BLoC Pattern    | RTK Pattern         | Notes                |
| --------------- | ------------------- | -------------------- |
| `Bloc`          | Slice + middleware  | Business logic       |
| `Event`         | Action              | Dispatched events    |
| `State`         | State type          | TypeScript interface |
| `emit()`        | Reducer             | State updates        |
| `Stream<State>` | Subscriptions       | useSelector          |
| `BlocBuilder`   | Connected component | useSelector          |
| `BlocListener`  | useEffect           | Side effects         |
| `BlocConsumer`  | Component + effect  | Combined             |

## Package Mappings

### Core Dependencies

| Dart Package        | NPM Package                        | Purpose              |
| ------------------- | ---------------------------------- | -------------------- |
| `flutter/material`  | `@mui/material`                    | UI components        |
| `flutter/cupertino` | `@mui/material`                    | iOS-style components |
| `provider`          | `react-redux` + `@reduxjs/toolkit` | State management     |
| `riverpod`          | `@reduxjs/toolkit`                 | State management     |
| `bloc`              | `@reduxjs/toolkit`                 | State management     |
| `get_it`            | Built-in DI or `inversify`         | Dependency injection |
| `dio`               | `axios`                            | HTTP client          |
| `http`              | `fetch` API                        | HTTP requests        |

### Routing & Navigation

| Dart Package | NPM Package        | Notes                |
| ------------ | ------------------ | -------------------- |
| `go_router`  | `react-router-dom` | v6 recommended       |
| `auto_route` | `react-router-dom` | With code generation |
| `fluro`      | `react-router-dom` | Legacy migration     |
| `beamer`     | `react-router-dom` | Declarative routing  |

### Data & Storage

| Dart Package         | NPM Package            | Purpose              |
| -------------------- | ---------------------- | -------------------- |
| `shared_preferences` | `localforage`          | Key-value storage    |
| `hive`               | `localforage` + `idb`  | NoSQL database       |
| `sqflite`            | `sql.js` or IndexedDB  | SQL database         |
| `drift`              | `prisma` (for backend) | ORM                  |
| `floor`              | TypeORM or Prisma      | Database abstraction |
| `path_provider`      | Browser File API       | File system access   |
| `firebase_*`         | `firebase`             | Firebase services    |

### Utilities

| Dart Package         | NPM Package             | Alternative         |
| -------------------- | ----------------------- | ------------------- |
| `rxdart`             | `rxjs`                  | Reactive extensions |
| `json_serializable`  | TypeScript types        | Built-in            |
| `freezed`            | TypeScript interfaces   | With readonly       |
| `equatable`          | Custom equality         | Or Immer            |
| `intl`               | `react-intl`            | i18n                |
| `url_launcher`       | `window.open()`         | Native browser      |
| `connectivity_plus`  | `navigator.onLine`      | Network status      |
| `permission_handler` | Browser Permissions API | Native API          |

### UI & Animations

| Dart Package           | NPM Package             | Purpose            |
| ---------------------- | ----------------------- | ------------------ |
| `animations`           | `framer-motion`         | Animations         |
| `flutter_animate`      | `react-spring`          | Spring animations  |
| `lottie`               | `lottie-react`          | Lottie animations  |
| `cached_network_image` | `react-lazy-load-image` | Image optimization |
| `flutter_svg`          | `react-svg`             | SVG support        |
| `photo_view`           | `react-image-gallery`   | Image viewer       |
| `shimmer`              | CSS animations          | Skeleton screens   |

## Hook Patterns

### Lifecycle Mappings

| Flutter Lifecycle         | React Hook                | Usage                   |
| ------------------------- | ------------------------- | ----------------------- |
| `initState()`             | `useEffect(() => {}, [])` | Component mount         |
| `dispose()`               | `useEffect` cleanup       | Return cleanup function |
| `didChangeDependencies()` | `useEffect` deps          | Dependency array        |
| `didUpdateWidget()`       | `useEffect` with deps     | Prop changes            |
| `setState()`              | `useState` setter         | State updates           |
| `build()`                 | Component return          | Render method           |

### Custom Hook Patterns

```typescript
// Flutter StreamBuilder equivalent
function useStream<T>(stream$: Observable<T>, initialValue: T) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const subscription = stream$.subscribe(setValue);
    return () => subscription.unsubscribe();
  }, [stream$]);

  return value;
}

// Flutter FutureBuilder equivalent
function useFuture<T>(asyncFn: () => Promise<T>) {
  const [state, setState] = useState<{
    loading: boolean;
    data?: T;
    error?: Error;
  }>({ loading: true });

  useEffect(() => {
    asyncFn()
      .then((data) => setState({ loading: false, data }))
      .catch((error) => setState({ loading: false, error }));
  }, []);

  return state;
}

// Flutter ValueListenableBuilder equivalent
function useValueListenable<T>(listenable: ValueListenable<T>) {
  const [value, setValue] = useState(listenable.value);

  useEffect(() => {
    const listener = () => setValue(listenable.value);
    listenable.addListener(listener);
    return () => listenable.removeListener(listener);
  }, [listenable]);

  return value;
}
```

## Error Handling Patterns

### Exception Mapping

| Dart Exception      | TypeScript/React    | Handling             |
| ------------------- | ------------------- | -------------------- |
| `try/catch`         | `try/catch`         | Same syntax          |
| `throw Exception()` | `throw new Error()` | Error class          |
| `catchError`        | `.catch()`          | Promise rejection    |
| `onError` stream    | Error boundary      | React error boundary |
| `FlutterError`      | `console.error`     | Error logging        |
| `assert()`          | TypeScript checks   | Compile-time         |

### Error Boundary Pattern

```typescript
// Flutter error handling to React Error Boundary
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: React.ComponentType<{ error: Error }>;
  },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      return <Fallback error={this.state.error!} />;
    }
    return this.props.children;
  }
}
```

## Testing Mappings

| Flutter Testing    | React Testing              | Library                |
| ------------------ | -------------------------- | ---------------------- |
| `testWidgets()`    | `render()` + `screen`      | @testing-library/react |
| `WidgetTester`     | Testing Library queries    | RTL                    |
| `find.byType()`    | `screen.getByRole()`       | RTL queries            |
| `pump()`           | `waitFor()`                | Async rendering        |
| `pumpAndSettle()`  | `waitFor()` with condition | Wait for updates       |
| `mockito`          | `vitest` mocks             | vi.mock()              |
| `golden tests`     | Snapshot tests             | Jest/Vitest            |
| `integration_test` | Playwright/Cypress         | E2E testing            |

## Performance Optimization Patterns

| Flutter Pattern     | React Pattern    | Implementation             |
| ------------------- | ---------------- | -------------------------- |
| `const` constructor | `React.memo()`   | Prevent re-renders         |
| `AnimatedContainer` | CSS transitions  | Or framer-motion           |
| `CustomPainter`     | Canvas API       | Or SVG                     |
| `RepaintBoundary`   | `React.memo()`   | Isolate re-renders         |
| `ListView.builder`  | Virtualization   | react-window               |
| `Image.asset`       | Optimized images | Next/Image or lazy loading |
| `compute()`         | Web Workers      | Background processing      |

## Platform-Specific Handling

| Flutter Platform     | Web Equivalent     | Detection           |
| -------------------- | ------------------ | ------------------- |
| `Platform.isIOS`     | User agent check   | Navigator.userAgent |
| `Platform.isAndroid` | User agent check   | Mobile detection    |
| `kIsWeb`             | Always true        | Web platform        |
| `DeviceOrientation`  | Screen.orientation | Browser API         |
| `MediaQuery`         | CSS media queries  | @media rules        |
| Platform channels    | Not applicable     | Use REST/WebSocket  |

## Common Gotchas & Solutions

### Type System Differences

1. **No method overloading in TypeScript**
   - Use optional parameters or union types
   - Create separate functions with different names

2. **Null safety differences**
   - Dart's sound null safety vs TypeScript's structural typing
   - Always use strict mode in TypeScript
   - Add explicit null checks

3. **Generic constraints**
   - TypeScript generics are more flexible but less strict
   - Use extends constraints for type safety

### Async Patterns

1. **No async generators in older browsers**
   - Use RxJS Observables for stream-like behavior
   - Polyfill for AsyncIterator if needed

2. **Promise vs Future differences**
   - Promises are eager, Futures are lazy
   - Promises auto-unwrap in async/await

3. **Error handling in async code**
   - Always use try/catch in async functions
   - Handle Promise rejections explicitly

### State Management

1. **Immutability requirements**
   - Redux requires immutable updates
   - Use Immer (built into RTK) for easier updates

2. **Subscription management**
   - Manual cleanup in useEffect
   - Use RTK Query for automatic cache management

3. **Context vs Redux**
   - Context for low-frequency updates
   - Redux for complex state logic

## Migration Checklist

- [ ] Map all Dart types to TypeScript
- [ ] Convert widgets to React components
- [ ] Set up Redux Toolkit store
- [ ] Configure RTK Query for API calls
- [ ] Implement routing with React Router
- [ ] Set up error boundaries
- [ ] Configure build tool (Vite)
- [ ] Add TypeScript strict mode
- [ ] Implement i18n if needed
- [ ] Set up testing framework
- [ ] Configure linting and formatting
- [ ] Add accessibility attributes
- [ ] Optimize bundle size
- [ ] Set up CI/CD pipeline
- [ ] Document API changes

## Quick Decision Trees

### State Management Choice

```
Need server state? → RTK Query
Need global client state? → Redux Toolkit slice
Need form state? → React Hook Form
Need local component state? → useState
```

### Component Type Choice

```
Has route? → Page component
Has business logic? → Feature component
Pure presentation? → Shared component
Wraps children? → Layout component
```

### Styling Solution

```
Design system? → MUI or Ant Design
Custom design? → Tailwind or CSS Modules
CSS-in-JS? → Emotion or styled-components
Animations? → Framer Motion or React Spring
```

## References

- [Dart Language Tour](https://dart.dev/guides/language/language-tour)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [React 18 Documentation](https://react.dev)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [React Router v6](https://reactrouter.com)
- [Vite Documentation](https://vitejs.dev)
