
import React, { useState } from 'react';

interface ChangePasswordScreenProps {
    onSubmit: (newPassword: string) => Promise<void>;
    error: string | null;
}

const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({ onSubmit, error }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [validationError, setValidationError] = useState('');

    const handleSubmit = async () => {
        if (!newPassword || !confirmPassword) {
            setValidationError('Vui lòng nhập đầy đủ mật khẩu mới và xác nhận.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setValidationError('Mật khẩu xác nhận không khớp.');
            return;
        }
        if (newPassword.length < 6) {
            setValidationError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        setValidationError('');
        await onSubmit(newPassword);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center sm:py-12">
            <div className="p-10 xs:p-0 mx-auto md:w-full md:max-w-md">
                <h1 className="font-bold text-center text-2xl mb-2">Đổi Mật khẩu Bắt buộc</h1>
                <p className="text-center text-gray-600 mb-5">Vì lý do bảo mật, bạn phải đổi mật khẩu trong lần đăng nhập đầu tiên.</p>
                <div className="bg-white shadow w-full rounded-lg divide-y divide-gray-200">
                    <div className="px-5 py-7">
                        {(validationError || error) && 
                            <p className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center mb-4'>
                                {validationError || error}
                            </p>
                        }
                        <label className="font-semibold text-sm text-gray-600 pb-1 block">Mật khẩu mới</label>
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="border rounded-lg px-3 py-2 mt-1 mb-5 text-sm w-full" 
                            placeholder="Nhập mật khẩu có ít nhất 6 ký tự"
                        />
                        <label className="font-semibold text-sm text-gray-600 pb-1 block">Xác nhận mật khẩu mới</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                            className="border rounded-lg px-3 py-2 mt-1 mb-5 text-sm w-full" 
                            placeholder="Nhập lại mật khẩu mới"
                        />
                        <button 
                            type="button" 
                            onClick={handleSubmit}
                            className="transition duration-200 bg-blue-600 hover:bg-blue-700 focus:bg-blue-800 focus:shadow-sm focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 text-white w-full py-2.5 rounded-lg text-sm shadow-sm hover:shadow-md font-semibold text-center inline-block">
                            <span className="inline-block mr-2">Xác nhận và tiếp tục</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordScreen;
