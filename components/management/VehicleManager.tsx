import React, { useState } from 'react';
import { Vehicle, FuelType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { ListItemCard, ModalForm } from './ManagementUI';

const VehicleForm: React.FC<{
    initialData: Vehicle | null;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}> = ({ initialData, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<Partial<Vehicle>>(initialData || { name: '', licensePlate: '', fuelType: FuelType.DIESEL, consumptionRate: 0, consumptionUnit: 'lít/giờ' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try { await onSubmit(formData); onClose(); } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
    };

    return (
        <ModalForm isOpen={true} title={initialData ? "Cập nhật xe" : "Thêm xe mới"} onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting}>
            <div className="space-y-4">
                <input type="text" placeholder="Tên xe (VD: Xe số 01)" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-lg" required />
                <input type="text" placeholder="Biển số" value={formData.licensePlate || ''} onChange={e => setFormData({ ...formData, licensePlate: e.target.value })} className="w-full p-3 border rounded-lg" required />
                <select value={formData.fuelType || FuelType.DIESEL} onChange={e => setFormData({ ...formData, fuelType: e.target.value as FuelType })} className="w-full p-3 border rounded-lg">
                    <option value={FuelType.DIESEL}>Dầu Diesel</option>
                    <option value={FuelType.ELECTRIC}>Điện</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Định mức tiêu thụ" value={formData.consumptionRate || ''} onChange={e => setFormData({ ...formData, consumptionRate: Number(e.target.value) })} className="w-full p-3 border rounded-lg" required />
                    <input type="text" placeholder="Đơn vị (lít/h)" value={formData.consumptionUnit || ''} onChange={e => setFormData({ ...formData, consumptionUnit: e.target.value })} className="w-full p-3 border rounded-lg" required />
                </div>
            </div>
        </ModalForm>
    );
};

export const VehicleManager: React.FC = () => {
    const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useAppContext();
    const [editingItem, setEditingItem] = useState<Vehicle | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleFormSubmit = async (data: any) => editingItem ? await updateVehicle({ ...editingItem, ...data }) : await addVehicle(data);

    return (
        <div className="pb-24">
            {(vehicles || []).map(v => (
                <ListItemCard key={v.id} title={v.name} subtitle={`${v.licensePlate} - ${v.consumptionRate} ${v.consumptionUnit}`} onEdit={() => { setEditingItem(v); setIsFormOpen(true); }} onDelete={() => deleteVehicle(v.id)} />
            ))}
            <button onClick={() => { setEditingItem(null); setIsFormOpen(true); }} className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg z-30"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
            {isFormOpen && <VehicleForm initialData={editingItem} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} />}
        </div>
    );
};