import React, { useState, useRef } from 'react';

interface PaymentChannel {
  name: string;
  _id: string;
  logo?: string;
}

interface PaymentMethod {
  method: string;
  channels: PaymentChannel[];
  _id: string;
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

interface GeneralSettingsProps {
  formData: FormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleLogoChange: (logoUrl: string, file?: File) => void;
  defaultProfilePictureUrl: string;
  onDefaultProfilePictureChange: (file: File) => void;
  onUploadDefaultProfilePicture: () => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ 
  formData, 
  handleInputChange, 
  handleLogoChange,
  defaultProfilePictureUrl,
  onDefaultProfilePictureChange,
  onUploadDefaultProfilePicture
}) => {
  const [isEditingLogo, setIsEditingLogo] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string>(formData.storeLogo);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingDefaultProfile, setIsEditingDefaultProfile] = useState<boolean>(false);
  const [defaultProfilePreview, setDefaultProfilePreview] = useState<string>(defaultProfilePictureUrl);
  const defaultProfileFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoSave = () => {
    handleLogoChange(logoUrl, selectedFile || undefined);
    setIsEditingLogo(false);
  };

  const handleLogoCancel = () => {
    setLogoUrl(formData.storeLogo);
    setSelectedFile(null);
    setIsEditingLogo(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDefaultProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onDefaultProfilePictureChange(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setDefaultProfilePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerDefaultProfileFileInput = () => {
    defaultProfileFileInputRef.current?.click();
  };

  const handleDefaultProfileSave = () => {
    onUploadDefaultProfilePicture();
    setIsEditingDefaultProfile(false);
  };

  const handleDefaultProfileCancel = () => {
    setDefaultProfilePreview(defaultProfilePictureUrl);
    setIsEditingDefaultProfile(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Informasi Toko</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Toko</label>
            <input
              type="text"
              name="storeName"
              value={formData.storeName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
            <input
              type="text"
              name="storePhone"
              value={formData.storePhone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              name="storeAddress"
              value={formData.storeAddress}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
          <div className="sm:col-span-2">
            <label className="text-lg font-medium text-gray-900 mb-4">Logo Toko</label>
            
            {isEditingLogo ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Store Logo Preview" 
                        className="h-16 w-16 object-contain border border-gray-200 rounded"
                      />
                    ) : (
                      <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No Logo</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
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
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Pilih Gambar
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                      PNG, JPG, atau GIF. Maksimal 2MB.
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleLogoSave}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoCancel}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {formData.storeLogo ? (
                    <img 
                      src={formData.storeLogo} 
                      alt="Store Logo" 
                      className="h-16 w-16 object-contain border border-gray-200 rounded"
                    />
                  ) : (
                    <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Logo</span>
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsEditingLogo(true)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {formData.storeLogo ? 'Ganti Logo' : 'Tambah Logo'}
                  </button>
                  {formData.storeLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoUrl('');
                        setSelectedFile(null);
                        handleLogoChange('');
                      }}
                      className="ml-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <input
              type="hidden"
              name="storeLogo"
              value={formData.storeLogo}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Gambar Profile User Default</h2>
        
        {isEditingDefaultProfile ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {defaultProfilePreview ? (
                  <img 
                    src={defaultProfilePreview} 
                    alt="Default Profile Preview" 
                    className="h-16 w-16 object-contain border border-gray-200 rounded-full"
                  />
                ) : (
                  <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <input
                  type="file"
                  ref={defaultProfileFileInputRef}
                  onChange={handleDefaultProfileFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={triggerDefaultProfileFileInput}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Pilih Gambar
                </button>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, atau GIF. Maksimal 2MB.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleDefaultProfileSave}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={handleDefaultProfileCancel}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {defaultProfilePictureUrl ? (
                <img 
                  src={defaultProfilePictureUrl} 
                  alt="Default Profile" 
                  className="h-16 w-16 object-contain border border-gray-200 rounded-full"
                />
              ) : (
                <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No Image</span>
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setIsEditingDefaultProfile(true)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {defaultProfilePictureUrl ? 'Ganti Gambar' : 'Tambah Gambar'}
              </button>
              {defaultProfilePictureUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setDefaultProfilePreview('');
                    onDefaultProfilePictureChange(new File([], ''));
                  }}
                  className="ml-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralSettings;