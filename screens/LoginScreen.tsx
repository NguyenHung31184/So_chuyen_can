
import React, { useState } from 'react';

interface LoginScreenProps {
    onLogin: (phone: string, pass: string) => void;
    error: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [validationError, setValidationError] = useState('');

    const handleLoginClick = () => {
        // Basic validation
        if (!phone || !password) {
            setValidationError('Vui lòng nhập đầy đủ số điện thoại và mật khẩu.');
            return;
        }
        // Phone number format validation (basic) - allowing for international format starting with +
        if (!/^(\+)?\d{9,15}$/.test(phone)) {
             setValidationError('Số điện thoại không hợp lệ.');
             return;
        }

        setValidationError('');
        onLogin(phone, password);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center sm:py-12">
            <div className="p-10 xs:p-0 mx-auto md:w-full md:max-w-md">
                <h1 className="font-bold text-center text-2xl mb-5">Đăng nhập hệ thống</h1>
                <div className="bg-white shadow w-full rounded-lg divide-y divide-gray-200">
                    <div className="px-5 py-7">
                        {(validationError || error) && 
                            <p className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center mb-4'>
                                {validationError || error}
                            </p>
                        }
                        <label className="font-semibold text-sm text-gray-600 pb-1 block">Số điện thoại</label>
                        <input 
                            type="tel" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleLoginClick(); }}
                            className="border rounded-lg px-3 py-2 mt-1 mb-5 text-sm w-full" 
                            placeholder='0912345678'
                        />
                        <label className="font-semibold text-sm text-gray-600 pb-1 block">Mật khẩu</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleLoginClick(); }}
                            className="border rounded-lg px-3 py-2 mt-1 mb-5 text-sm w-full" 
                            placeholder='********'
                        />
                        <button 
                            type="button" 
                            onClick={handleLoginClick}
                            className="transition duration-200 bg-blue-600 hover:bg-blue-700 focus:bg-blue-800 focus:shadow-sm focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 text-white w-full py-2.5 rounded-lg text-sm shadow-sm hover:shadow-md font-semibold text-center inline-block">
                            <span className="inline-block mr-2">Đăng nhập</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
