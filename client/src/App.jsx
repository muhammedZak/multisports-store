import AppRouter from './app/router/AppRouter.jsx';

import CartSessionSync from './features/cart/CartSessionSync.jsx';

function App() {
  return (
    <>
      <CartSessionSync />

      <AppRouter />
    </>
  );
}

export default App;
