import React, { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Camera, X, Check, Save, Image } from 'lucide-react';

interface PaymentChannel {
  name: string;
  _id: string;
  logo?: string;
  isActive: boolean;
}

interface PaymentMethod {
  method: string;
  channels: PaymentChannel[];
  _id: string;
  isActive: boolean;
}

interface FormData {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeLogo: string;
  receiptHeader: string;
  receiptFooter: string;
  taxRate: number;
  globalDiscount: number;
  serviceCharge: number;
  lowStockAlert: number;
  currency: string;
  dateFormat: string;
  language: string;
  showBarcode: boolean;
  showCashierName: boolean;
  paymentMethods: string[];
  payment_methods: PaymentMethod[];
}

interface PaymentSettingsProps {
  formData: FormData;
  handlePaymentMethodChange: (method: string, checked: boolean) => void;
  handleChannelLogoChange: (methodId: string, channelId: string, logoUrl: string, file?: File) => void;
  onTogglePaymentMethod: (methodName: string, isActive: boolean) => void;
  onUpdateChannelName: (methodId: string, channelId: string, newName: string) => void;
  onAddPaymentMethod: (methodName: string, channels?: { name: string }[]) => void;
  onAddChannelToMethod: (methodName: string, channelName: string, logoFile?: File) => void;
  onDeleteChannel: (methodName: string, channelName: string) => void;
  onToggleChannelStatus: (methodName: string, channelName: string, isActive: boolean) => void;
  onDeletePaymentMethod: (methodName: string) => void;
}

const PaymentSettings: React.FC<PaymentSettingsProps> = ({ 
  formData, 
  
  handleChannelLogoChange,
  onTogglePaymentMethod,
  onUpdateChannelName,
  onAddPaymentMethod,
  onAddChannelToMethod,
  onDeleteChannel,
  onToggleChannelStatus,
  onDeletePaymentMethod
}) => {
  const [editingChannel, setEditingChannel] = useState<{methodId: string, channelId: string} | null>(null);
  const [editingChannelName, setEditingChannelName] = useState<{methodId: string, channelId: string, newName: string} | null>(null);
  const [tempLogos, setTempLogos] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [tempChannelName, setTempChannelName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State untuk menambah payment method baru
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>('');
  const [newPaymentMethodChannels, setNewPaymentMethodChannels] = useState<string[]>(['']);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState<boolean>(false);
  
  // State untuk menambah channel baru
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [selectedMethodName, setSelectedMethodName] = useState<string>('');
  const [newChannelLogoFile, setNewChannelLogoFile] = useState<File | null>(null);
  const [newChannelLogoPreview, setNewChannelLogoPreview] = useState<string>('');
  const [showAddChannel, setShowAddChannel] = useState<boolean>(false);
  const channelLogoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingChannel) {
      const key = `${editingChannel.methodId}-${editingChannel.channelId}`;
      setSelectedFiles(prev => ({
        ...prev,
        [key]: file
      }));
      
      // Untuk preview, baca sebagai data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setTempLogos(prev => ({
          ...prev,
          [key]: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle file change untuk channel baru
  const handleNewChannelLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewChannelLogoFile(file);
      
      // Untuk preview, baca sebagai data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setNewChannelLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startEditing = (methodId: string, channelId: string, currentLogo?: string) => {
    if (editingChannelName) {
      setEditingChannelName(null);
    }
    
    setEditingChannel({ methodId, channelId });
    const key = `${methodId}-${channelId}`;
    setTempLogos(prev => ({
      ...prev,
      [key]: currentLogo || ''
    }));
  };

  const saveLogo = () => {
    if (editingChannel) {
      const key = `${editingChannel.methodId}-${editingChannel.channelId}`;
      const logoUrl = tempLogos[key] || '';
      const file = selectedFiles[key];
      
      // Kirim base64 untuk preview dan file asli untuk upload
      handleChannelLogoChange(editingChannel.methodId, editingChannel.channelId, logoUrl, file);
      setEditingChannel(null);
    }
  };

  const cancelEditing = () => {
    setEditingChannel(null);
    setTempLogos({});
    setSelectedFiles({});
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeLogo = () => {
    if (editingChannel) {
      const key = `${editingChannel.methodId}-${editingChannel.channelId}`;
      setTempLogos(prev => ({
        ...prev,
        [key]: ''
      }));
      setSelectedFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[key];
        return newFiles;
      });
    }
  };

  // Remove logo untuk channel baru
  const removeNewChannelLogo = () => {
    setNewChannelLogoFile(null);
    setNewChannelLogoPreview('');
  };

  const triggerChannelLogoInput = () => {
    channelLogoInputRef.current?.click();
  };

  const startEditingChannelName = (methodId: string, channelId: string, currentName: string) => {
    if (editingChannel) {
      setEditingChannel(null);
      setTempLogos({});
      setSelectedFiles({});
    }
    
    setEditingChannelName({ methodId, channelId, newName: currentName });
    setTempChannelName(currentName);
  };

  const saveChannelName = () => {
    if (editingChannelName) {
      onUpdateChannelName(editingChannelName.methodId, editingChannelName.channelId, tempChannelName);
      setEditingChannelName(null);
    }
  };

  const cancelEditingChannelName = () => {
    setEditingChannelName(null);
  };

  const handleChannelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempChannelName(e.target.value);
  };

  // Handle perubahan input channel untuk payment method baru
  const handlePaymentMethodChannelChange = (index: number, value: string) => {
    const newChannels = [...newPaymentMethodChannels];
    newChannels[index] = value;
    setNewPaymentMethodChannels(newChannels);
  };

  // Tambah channel baru untuk payment method baru
  const addPaymentMethodChannel = () => {
    setNewPaymentMethodChannels([...newPaymentMethodChannels, '']);
  };

  // Hapus channel untuk payment method baru
  const removePaymentMethodChannel = (index: number) => {
    if (newPaymentMethodChannels.length > 1) {
      const newChannels = [...newPaymentMethodChannels];
      newChannels.splice(index, 1);
      setNewPaymentMethodChannels(newChannels);
    }
  };

  // Fungsi untuk menambah payment method baru
  const handleAddPaymentMethod = () => {
    if (newPaymentMethod.trim()) {
      // Filter channel yang tidak kosong
      const channels = newPaymentMethodChannels
        .filter(channel => channel.trim() !== '')
        .map(channel => ({ name: channel.trim() }));
      
      onAddPaymentMethod(newPaymentMethod.trim(), channels);
      setNewPaymentMethod('');
      setNewPaymentMethodChannels(['']);
      setShowAddPaymentMethod(false);
    }
  };

  // Fungsi untuk menambah channel baru
  const handleAddChannel = () => {
    if (newChannelName.trim() && selectedMethodName) {
      onAddChannelToMethod(selectedMethodName, newChannelName.trim(), newChannelLogoFile || undefined);
      setNewChannelName('');
      setSelectedMethodName('');
      setNewChannelLogoFile(null);
      setNewChannelLogoPreview('');
      setShowAddChannel(false);
    }
  };

  // Fungsi untuk menghapus channel
  const handleDeleteChannel = (methodName: string, channelName: string) => {
    onDeleteChannel(methodName, channelName);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Detail Metode Pembayaran</h2>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowAddPaymentMethod(!showAddPaymentMethod)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Tambah Metode
            </button>
            <button
              type="button"
              onClick={() => setShowAddChannel(!showAddChannel)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Tambah Channel
            </button>
          </div>
        </div>
        
        {showAddPaymentMethod && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nama Metode Pembayaran</label>
              <input
                type="text"
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                placeholder="Nama metode pembayaran baru"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Channel</label>
                <button
                  type="button"
                  onClick={addPaymentMethodChannel}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Channel
                </button>
              </div>
              
              {newPaymentMethodChannels.map((channel, index) => (
                <div key={index} className="flex items-center space-x-2 mb-3">
                  <input
                    type="text"
                    value={channel}
                    onChange={(e) => handlePaymentMethodChannelChange(index, e.target.value)}
                    placeholder="Nama channel"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {newPaymentMethodChannels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentMethodChannel(index)}
                      className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleAddPaymentMethod}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddPaymentMethod(false);
                  setNewPaymentMethod('');
                  setNewPaymentMethodChannels(['']);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200"
              >
                Batal
              </button>
            </div>
          </div>
        )}
        
        {showAddChannel && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
                <select
                  value={selectedMethodName}
                  onChange={(e) => setSelectedMethodName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih metode pembayaran</option>
                  {formData.payment_methods.map((pm) => (
                    <option key={pm._id} value={pm.method}>
                      {pm.method}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Channel</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Nama channel baru"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo Channel</label>
              <div className="flex items-center space-x-4">
                {newChannelLogoPreview ? (
                  <img 
                    src={newChannelLogoPreview} 
                    alt="Channel Logo Preview" 
                    className="h-16 w-16 object-contain border border-gray-200 rounded-md"
                  />
                ) : (
                  <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                    <Image className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                
                <div>
                  <input
                    type="file"
                    ref={channelLogoInputRef}
                    onChange={handleNewChannelLogoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={triggerChannelLogoInput}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200 mr-2"
                  >
                    {newChannelLogoPreview ? 'Ganti Logo' : 'Pilih Logo'}
                  </button>
                  {newChannelLogoPreview && (
                    <button
                      type="button"
                      onClick={removeNewChannelLogo}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition duration-200"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={handleAddChannel}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddChannel(false);
                  setNewChannelName('');
                  setSelectedMethodName('');
                  setNewChannelLogoFile(null);
                  setNewChannelLogoPreview('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200"
              >
                Batal
              </button>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          {formData.payment_methods.map((pm) => (
            <div key={pm._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition duration-200">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 text-lg">{pm.method}</h3>
                <div className="flex items-center space-x-3">
                  {/* Toggle untuk status metode pembayaran */}
                  <div className="flex items-center">
                    <span className={`mr-2 text-sm font-medium ${pm.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {pm.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pm.isActive}
                        onChange={(e) => onTogglePaymentMethod(pm.method, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {/* Tombol hapus metode pembayaran */}
                  <button
                    type="button"
                    onClick={() => onDeletePaymentMethod(pm.method)}
                    className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                    title="Hapus Metode Pembayaran"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {pm.channels.map((channel: PaymentChannel) => {
                  const isEditingLogo = editingChannel?.methodId === pm._id && editingChannel?.channelId === channel._id;
                  const isEditingName = editingChannelName?.methodId === pm._id && editingChannelName?.channelId === channel._id;
                  const tempKey = `${pm._id}-${channel._id}`;
                  const currentLogo = isEditingLogo ? tempLogos[tempKey] : channel.logo;
                  
                  return (
                    <div key={channel._id} className={`p-4 rounded-lg ${isEditingLogo ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {currentLogo ? (
                            <img 
                              src={currentLogo} 
                              alt={channel.name} 
                              className="h-10 w-10 object-contain mr-4 border border-gray-200 rounded-md p-1 bg-white"
                            />
                          ) : (
                            <div className="h-10 w-10 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center mr-4 bg-white">
                              <Image className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          
                          {isEditingName ? (
                            <div className="flex items-center">
                              <input
                                type="text"
                                value={tempChannelName}
                                onChange={handleChannelNameChange}
                                className="border border-gray-300 rounded-md px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                              <div className="ml-2 flex space-x-1">
                                <button
                                  type="button"
                                  onClick={saveChannelName}
                                  className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:text-white hover:bg-green-600 rounded-lg border border-green-200 hover:border-green-600 transition-all duration-200"
                                  title="Simpan"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingChannelName}
                                  className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                                  title="Batal"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-800">{channel.name}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {/* Toggle untuk status channel */}
                          <div className="flex items-center">
                            <span className={`mr-2 text-sm font-medium ${channel.isActive ? 'text-green-600' : 'text-red-600'}`}>
                              {channel.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={channel.isActive}
                                onChange={(e) => onToggleChannelStatus(pm.method, channel.name, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          
                          {!isEditingName && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditingChannelName(pm._id, channel._id, channel.name)}
                                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg border border-blue-200 hover:border-blue-600 transition-all duration-200"
                                title="Edit Nama"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              
                              {isEditingLogo ? (
                                <div className="flex space-x-2">
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={triggerFileInput}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-white hover:bg-gray-600 rounded-lg border border-gray-200 hover:border-gray-600 transition-all duration-200"
                                    title={currentLogo ? 'Ganti Logo' : 'Pilih Logo'}
                                  >
                                    <Camera className="w-4 h-4" />
                                  </button>
                                  {currentLogo && (
                                    <button
                                      type="button"
                                      onClick={removeLogo}
                                      className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                                      title="Hapus Logo"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={saveLogo}
                                    className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:text-white hover:bg-green-600 rounded-lg border border-green-200 hover:border-green-600 transition-all duration-200"
                                    title="Simpan"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditing}
                                    className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                                    title="Batal"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditing(pm._id, channel._id, channel.logo)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:text-white hover:bg-green-600 rounded-lg border border-green-200 hover:border-green-600 transition-all duration-200"
                                    title={channel.logo ? 'Edit Logo' : 'Tambah Logo'}
                                  >
                                    <Camera className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteChannel(pm.method, channel.name)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                                    title="Hapus Channel"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isEditingLogo && (
                        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md">
                          <div className="flex items-center space-x-4">
                            {currentLogo ? (
                              <img 
                                src={currentLogo} 
                                alt="Channel Logo Preview" 
                                className="h-20 w-20 object-contain border border-gray-200 rounded-md p-2 bg-white"
                              />
                            ) : (
                              <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center bg-white">
                                <Image className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <p className="text-sm text-gray-600 mb-2">
                                {currentLogo 
                                  ? "Logo saat ini. Klik 'Ganti Logo' untuk mengubah atau 'Hapus' untuk menghapus logo."
                                  : "Belum ada logo. Klik 'Pilih Logo' untuk menambahkan logo."}
                              </p>
                              <div className="flex space-x-2">
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handleFileChange}
                                  accept="image/*"
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  onClick={triggerFileInput}
                                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200"
                                >
                                  {currentLogo ? 'Ganti Logo' : 'Pilih Logo'}
                                </button>
                                {currentLogo && (
                                  <button
                                    type="button"
                                    onClick={removeLogo}
                                    className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition duration-200"
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-end space-x-3 mt-4 pt-3 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={saveLogo}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                            >
                              Simpan Perubahan
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;