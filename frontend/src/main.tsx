import ReactDOM from 'react-dom/client';
import './styles.css';
// import './styles/charka.css';
import './styles/charka.css';

import App from './app/app';
import { AppProviders } from './app/providers';

const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);
const RootComponent = () => {
  return (
    <AppProviders>
      <App />
    </AppProviders>
  );
};

root.render(<RootComponent />);

