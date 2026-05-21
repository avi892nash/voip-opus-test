import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import InstallPrompt from './components/InstallPrompt';
import Landing from './routes/Landing';
import Learn from './routes/Learn';
import Demo from './routes/Demo';
import Call from './routes/Call';
import Room from './routes/Room';
import Login from './routes/Login';
import Signup from './routes/Signup';
import NotFound from './routes/NotFound';
import { AuthProvider } from './lib/auth';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/call"
                element={
                  <ProtectedRoute>
                    <Call />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room"
                element={
                  <ProtectedRoute>
                    <Room />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room/:code"
                element={
                  <ProtectedRoute>
                    <Room />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <InstallPrompt />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
