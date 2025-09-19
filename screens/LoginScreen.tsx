import React, { useState } from 'react';

// --- SVG Icon for visual flair ---
const LoginIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
);


interface LoginScreenProps {
    onLogin: (phone: string, pass: string) => void;
    error: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [validationError, setValidationError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); // Prevent form submission from reloading the page
        
        // --- Validation logic remains the same ---
        if (!phone || !password) {
            setValidationError('Vui lòng nhập đầy đủ số điện thoại và mật khẩu.');
            return;
        }
        if (!/^(\+)?\d{9,15}$/.test(phone)) {
             setValidationError('Số điện thoại không hợp lệ.');
             return;
        }

        setValidationError('');
        onLogin(phone, password);
    };

    return (
        // --- Main container with a modern gradient background ---
        <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-600 p-4">
            
            <div className="w-full max-w-md">
                
                {/* --- App Title and Logo --- */}
                <header className="text-center mb-8">
                    <div className="inline-block bg-white/20 p-4 rounded-full backdrop-blur-sm">
                        <LoginIcon />
                    </div>
                    <h1 className="text-4xl font-bold text-white mt-4 tracking-wider">Sổ Chuyên Cần</h1>
                    <p className="text-white/80 mt-1">Đăng nhập để tiếp tục</p>
                </header>

                {/* --- Login Form --- */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">

                    {/* --- Display Errors --- */}
                    {(validationError || error) && 
                        <div className='bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center' role="alert">
                            <p>{validationError || error}</p>
                        </div>
                    }

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* --- Phone Number Input --- */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                            <input 
                                id="phone"
                                type="tel" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" 
                                placeholder='Ví dụ: 0912345678'
                                autoComplete="tel"
                            />
                        </div>

                        {/* --- Password Input --- */}
                        <div>
                            <label htmlFor="password"  className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                            <input 
                                id="password"
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" 
                                placeholder='••••••••'
                                autoComplete="current-password"
                            />
                        </div>

                        {/* --- Submit Button --- */}
                        <button 
                            type="submit" 
                            className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 transition-transform transform hover:scale-105">
                            Đăng nhập
                        </button>
                    </form>
                </div>

                {/* --- Footer --- */}
                <footer className="text-center mt-8">
                    <p className="text-sm text-white/60">
                        &copy; {new Date().getFullYear()} - Phát triển bởi Hưng Nguyễn
                    </p>
                </footer>
            </div>
        </main>
    );
};

export default LoginScreen;
