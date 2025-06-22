import { BrowserRouter } from 'react-router-dom';
import { DashboardProvider } from './contexts/DashboardContext';
import AppRoutes from './AppRoutes';

function App() {
    return (
        <DashboardProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </DashboardProvider>
    );
}

export default App;
