import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { loginUser } from '../utils/auth';
import { API_BASE_URL, apiFetch } from '../utils/api';

// 1. ADDED: Import the image from your assets folder. 
// Adjust the relative path ('../assets/office-bg.jpg') based on your folder structure and exact file name.
import bgImage from '../assets/crm_Banner-01.jpg.jpeg'; 

// Injects the two premium display/body faces used only on this screen so the
// rest of the app's font stack is untouched.
const useLoginFonts = () => {
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap';
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, []);
};

const Login = () => {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useLoginFonts();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const id = employeeId.trim();

        try {
            // Real authentication: the server looks up the employee, compares
            // the password against the bcrypt hash in the database, and
            // returns a signed session token (see POST /api/auth/login).
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ employeeId: id, password }),
            });

            loginUser(data.user.employeeId, data.user.role, data.user.name, data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Invalid employee ID or password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen min-h-[100dvh] flex items-center justify-center sm:justify-end bg-cover bg-center relative px-4 sm:px-6 md:px-16 lg:px-24 xl:pr-32 py-8"
            style={{ backgroundImage: `url(${bgImage})`, backgroundPosition: '25% center', fontFamily: "'Inter', sans-serif" }}
        >
            {/* Light overall tint so the banner stays visible behind the glass */}
            <div className="absolute inset-0 " />

            <div
                className="login-card relative z-10 w-full max-w-[22rem] sm:max-w-md md:max-w-lg p-7 sm:p-9 md:p-11 lg:p-12 rounded-2xl sm:rounded-[1.75rem] bg-white/10 backdrop-blur-2xl"
            >
                {/* Wordmark */}
                <h2
                    className="text-center text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] leading-none mb-3 select-none"
                    style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}
                >
                    <span className="text-black" style={{ fontWeight: 800 }}>Work</span>
                    <span className="text-black" style={{ fontWeight: 400 }}>Flow</span>
                </h2>

                <div className="flex justify-center mb-7 sm:mb-9 md:mb-10">
                </div>

                {error && (
                    <div className="bg-[#3A1418]/80 backdrop-blur-sm text-[#F5D9D5] p-2.5 sm:p-3 rounded-md text-sm sm:text-base mb-5 sm:mb-6 border border-[#8C3B3B]/60 text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6 md:space-y-7">
                    <div className="field-group relative">
                        <label className="block text-[10px] sm:text-xs tracking-[0.2em] uppercase text-[#000000] mb-2">
                            Employee ID
                        </label>
                        <div className="flex items-center gap-3 border-b-2 border-[#000000]/30 focus-within:border-[#000000] transition-colors py-2 sm:py-2.5">
                            <User className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#000000]/70 shrink-0" strokeWidth={1.75} />
                            <input
                                type="text"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                placeholder=" "
                                className="w-full bg-transparent border-0 text-[#000000] placeholder-[#5C6478] focus:outline-none focus:ring-0 text-base sm:text-lg tracking-wide"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="field-group relative">
                        <label className="block text-[10px] sm:text-xs tracking-[0.2em] uppercase text-[#000000] mb-2">
                            Password
                        </label>
                        <div className="flex items-center gap-3 border-b-2 border-[#000000]/30 focus-within:border-[#000000] transition-colors py-2 sm:py-2.5">
                            <Lock className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#000000]/70 shrink-0" strokeWidth={1.75} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder=" "
                                className="w-full bg-transparent border-0 text-[#000000] placeholder-[#5C6478] focus:outline-none focus:ring-0 text-base sm:text-lg tracking-wide"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end -mt-2">
                        <Link to="/forgot-password" className="text-xs text-[#000000]/70 hover:text-[#000000] underline underline-offset-2">
                            Forgot password?
                        </Link>
                    </div>

                    <div className="pt-2 sm:pt-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full overflow-hidden bg-gradient-to-r from-[#d02525] to-[#d02525] text-[#ffffff] font-semibold py-3 sm:py-3.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base uppercase tracking-[0.15em] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                                    Verifying
                                </>
                            ) : (
                                'Log In'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes cardRise {
                    from { opacity: 0; transform: translateY(14px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .login-card { animation: cardRise 0.55s ease-out both; }
                @media (prefers-reduced-motion: reduce) {
                    .login-card { animation: none; }
                }
            `}</style>
        </div>
    );
};

export default Login;