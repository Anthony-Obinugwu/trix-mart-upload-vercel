'use client'
import { ChangeEvent, FormEvent, useState, useRef, useEffect } from "react";
import Image from "next/image";
import Head from "next/head";

type UploadMessage = {
  text: string;
  isError: boolean;
};

type FileWithPreview = {
  file: File;
  preview?: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed';
  uploadError?: string;
};

type FileUploadState = {
  [key: string]: {
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    error?: string;
  };
};

export default function Home() {
  const [studentId, setStudentId] = useState<string>("");
  const [studentIdCardFile, setStudentIdCardFile] = useState<FileWithPreview | null>(null);
  const [productImages, setProductImages] = useState<FileWithPreview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [message, setMessage] = useState<UploadMessage>({ text: "", isError: false });
  const [messageVisible, setMessageVisible] = useState<boolean>(false);
  const [fileUploadStates, setFileUploadStates] = useState<FileUploadState>({});
  const [pageLoaded, setPageLoaded] = useState<boolean>(false);
  const studentIdCardInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const CLOUD_NAME = 'dega42p1c';
  const UPLOAD_PRESET = 'student_id_uploads';

  // Page load animation
  useEffect(() => {
    setPageLoaded(true);
  }, []);

  // Cleanup and message auto-hide
  useEffect(() => {
    return () => {
      if (studentIdCardFile?.preview) URL.revokeObjectURL(studentIdCardFile.preview);
      productImages.forEach(({ preview }) => {
        if (preview) URL.revokeObjectURL(preview);
      });
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [studentIdCardFile, productImages]);

  // Auto-hide message after 5 seconds
  useEffect(() => {
    if (messageVisible) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessageVisible(false);
      }, 5000);
    }
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [messageVisible]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const isStudentIdInput = e.target.id === 'student-id-card-input';

    // For student ID card, only allow 1 file
    if (isStudentIdInput && selectedFiles.length > 1) {
      setMessage({ text: "❌ Student ID Card: Only 1 file allowed", isError: true });
      setMessageVisible(true);
      if (studentIdCardInputRef.current) studentIdCardInputRef.current.value = '';
      return;
    }

    // For product images, allow up to 3 files
    if (!isStudentIdInput && productImages.length + selectedFiles.length > 3) {
      setMessage({ text: "❌ Product Images: Maximum 3 files allowed", isError: true });
      setMessageVisible(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validFiles: FileWithPreview[] = [];
    const invalidMessages: string[] = [];

    selectedFiles.forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'gif', 'webp', 'svg'];

      if (!extension || !allowedExtensions.includes(extension)) {
        invalidMessages.push(`Invalid file type: ${file.name}`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        invalidMessages.push(`File too large: ${file.name}`);
        return;
      }

      validFiles.push({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        uploadProgress: 0,
        uploadStatus: 'pending'
      });
    });

    if (invalidMessages.length > 0) {
      setMessage({ text: `❌ ${invalidMessages.join(' ')}`, isError: true});
      setMessageVisible(true);
      if (isStudentIdInput && studentIdCardInputRef.current) studentIdCardInputRef.current.value = '';
      if (!isStudentIdInput && fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (isStudentIdInput) {
      setStudentIdCardFile(validFiles[0]);
      setMessage({ text: `✅ Student ID Card uploaded successfully`, isError: false });
      if (studentIdCardInputRef.current) studentIdCardInputRef.current.value = '';
    } else {
      setProductImages(prev => [...prev, ...validFiles]);
      setMessage({ text: `✅ ${validFiles.length} product image(s) added successfully`, isError: false });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setMessageVisible(true);
  };

  const uploadToCloudinary = async (file: File, studentId: string, fileKey: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('public_id', `student_ids/${studentId}/${file.name}`);

    // Update status to uploading
    setFileUploadStates(prev => ({
      ...prev,
      [fileKey]: { progress: 10, status: 'uploading' }
    }));

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) throw new Error('Upload failed');

      // Simulate progress completion
      setFileUploadStates(prev => ({
        ...prev,
        [fileKey]: { progress: 100, status: 'completed' }
      }));

      return response.json();
    } catch (error) {
      setFileUploadStates(prev => ({
        ...prev,
        [fileKey]: {
          progress: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      }));
      throw error;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentIdCardFile || !productImages.length || !studentId) {
      setMessage({ text: "❌ Please fill all fields (Student ID, ID Card, and at least 1 product image)", isError: true });
      setMessageVisible(true);
      return;
    }

    setIsLoading(true);
    setMessage({ text: "", isError: false });

    // Initialize upload states
    const uploadStates: FileUploadState = {};
    uploadStates['student-id'] = { progress: 0, status: 'pending' };
    productImages.forEach((_, index) => {
      uploadStates[`product-${index}`] = { progress: 0, status: 'pending' };
    });
    setFileUploadStates(uploadStates);

    try {
      // Upload student ID card
      await uploadToCloudinary(studentIdCardFile.file, studentId, 'student-id');

      // Upload product images
      await Promise.all(
        productImages.map(({ file }, index) =>
          uploadToCloudinary(file, studentId, `product-${index}`)
        )
      );

      setIsSuccess(true);
      setMessage({ text: "✅ All files uploaded successfully!", isError: false });
      setMessageVisible(true);

      // Reset form after delay
      setTimeout(() => {
        setStudentId("");
        setStudentIdCardFile(null);
        setProductImages([]);
        setFileUploadStates({});
        if (studentIdCardInputRef.current) studentIdCardInputRef.current.value = '';
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
    } catch (err) {
      setMessage({
        text: `❌ Error: ${err instanceof Error ? err.message : "Upload failed"}`,
        isError: true,
      });
      setMessageVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <>
        <Head>
          <title>Upload Student ID - TrixMart</title>
          <meta name="description" content="Upload your student ID for verification" />
        </Head>
        <div className={`grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] transition-smooth ${pageLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
          <main className="flex flex-col gap-[32px] row-start-2 items-center w-full max-w-2xl px-4">
            <div id="upload-container" className={`card flex flex-col items-center w-full py-8 px-6 transition-smooth ${pageLoaded ? 'animate-slide-in-up' : 'opacity-0 translate-y-4'}`}>
              <Image
                  src="/trix-mart-text-and-logo.png"
                  className="mb-12"
                  width={200}
                  height={36}
                  alt="TrixMart Logo"
                  priority
              />

              {isSuccess ? (
                  <div className="flex flex-col items-center animate-scale-in">
                    <div className="success-animation mb-6">
                      <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-center">Welcome to TrixMart! 🎉</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-center">Your documents have been successfully uploaded</p>
                  </div>
              ) : (
                  <form onSubmit={handleSubmit} className="w-full">
                    {/* Student Id upload input */}
                    <div className="mb-6 animate-slide-in-down" style={{ animationDelay: '100ms' }}>
                      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                        Student ID
                      </label>
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
                        className="input-field focus-ring"
                        placeholder="Enter your student ID"
                        required
                        pattern="\d*"
                        disabled={isLoading}
                      />
                    </div>
                    {/* Student Identity Card upload input */}
                    <div className="w-full mb-6 animate-slide-in-down" style={{ animationDelay: '200ms' }}>
                      <div id="header-and-dropzone" className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                        <div id="header-container" className="text-center py-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-b border-blue-200 dark:border-blue-700">
                          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-200 flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                            Student ID Card
                          </h3>
                        </div>
                        <label
                          htmlFor="student-id-card-input"
                          className={`flex flex-col items-center justify-center w-full h-64 border-2 ${studentIdCardFile ? 'border-solid border-blue-300' : 'border-dashed border-gray-300 dark:border-gray-600'} cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900 dark:hover:to-blue-800 transition-smooth ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                        >
                        {studentIdCardFile ? (
                            <div className="w-full h-full p-4 overflow-y-auto flex flex-col items-center justify-center">
                              <div className="relative w-full h-full max-w-xs animate-scale-in">
                                {studentIdCardFile.preview ? (
                                  <>
                                    <Image
                                      src={studentIdCardFile.preview}
                                      alt="Student ID Card"
                                      fill
                                      className="object-cover rounded-lg"
                                      sizes="(max-width: 768px) 100vw, 384px"
                                    />
                                    {fileUploadStates['student-id']?.status === 'uploading' && (
                                      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                                        <div className="spinner"></div>
                                      </div>
                                    )}
                                    {fileUploadStates['student-id']?.status === 'completed' && (
                                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-2 animate-scale-in">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate text-center">{studentIdCardFile.file.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 animate-fade-in">
                              <svg className="w-12 h-12 mb-4 text-blue-400 animate-bounce-custom" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                              </svg>
                              <p className="mb-2 text-sm text-gray-700 dark:text-gray-300"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, PDF, GIF, WebP, SVG (MAX. 5MB)</p>
                            </div>
                        )}
                        <input
                            id="student-id-card-input"
                            type="file"
                            className="hidden"
                            ref={studentIdCardInputRef}
                            onChange={handleFileChange}
                            accept=".jpg,.jpeg,.png,.pdf,.gif,.webp,.svg"
                            multiple
                            disabled={isLoading}
                        />
                        </label>
                      </div>
                    </div>

                    {/* Product Images Upload input */}
                    <div className="w-full animate-slide-in-down" style={{ animationDelay: '300ms' }}>
                      <div id="header-and-dropzone" className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                        <div id="header-container" className="text-center py-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-b border-purple-200 dark:border-purple-700">
                          <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-200 flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                            </svg>
                            Product Images
                          </h3>
                        </div>
                        <label
                          htmlFor="product-images-input"
                          className={`flex flex-col items-center justify-center w-full h-64 border-2 ${productImages.length ? 'border-solid border-purple-300' : 'border-dashed border-gray-300 dark:border-gray-600'} cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-900 dark:hover:to-purple-800 transition-smooth ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                        >
                        {productImages.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4 w-full h-64 p-4 overflow-y-auto">
                              {productImages.map(({ file, preview }, index) => (
                                  <div key={index} className="relative h-full animate-scale-in" style={{ animationDelay: `${index * 50}ms` }}>
                                    {preview ? (
                                        <>
                                          <Image
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            fill
                                            className="object-cover rounded-lg"
                                            sizes="(max-width: 768px) 100vw, 384px"
                                          />
                                          {fileUploadStates[`product-${index}`]?.status === 'uploading' && (
                                            <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                                              <div className="spinner"></div>
                                            </div>
                                          )}
                                          {fileUploadStates[`product-${index}`]?.status === 'completed' && (
                                            <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1.5 animate-scale-in">
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                              </svg>
                                            </div>
                                          )}
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                                          <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate text-center">{file.name}</span>
                                        </div>
                                    )}
                                  </div>
                              ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 animate-fade-in">
                              <svg className="w-12 h-12 mb-4 text-purple-400 animate-bounce-custom" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                              </svg>
                              <p className="mb-2 text-sm text-gray-700 dark:text-gray-300"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, PDF, GIF, WebP, SVG (MAX. 5MB)</p>
                            </div>
                        )}
                        <input
                            id="product-images-input"
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".jpg,.jpeg,.png,.pdf,.gif,.webp,.svg"
                            multiple
                            disabled={isLoading}
                        />
                        </label>
                      </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary mt-8 w-full animate-slide-in-down"
                        style={{ animationDelay: '400ms' }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {isLoading ? (
                          <>
                            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 16.5A2.5 2.5 0 006.5 14h7A2.5 2.5 0 0016 16.5v.006v.014a.75.75 0 01-.003.145v.001a.75.75 0 01-.22.435h.001l-.001.001-.002.002-.003.003-.005.005-.009.009a.75.75 0 01-1.068-1.057 5.06 5.06 0 00.1-.168.75.75 0 11.936.464 6.561 6.561 0 00-.12-.207v-.001a.75.75 0 01-.22-.435.75.75 0 01-.003-.145v-.006zM6.5 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM13.5 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                            </svg>
                            Upload Files
                          </>
                        )}
                      </span>
                    </button>

                    {messageVisible && message.text && (
                        <div className={`mt-6 p-4 rounded-lg animate-slide-in-down transition-smooth ${
                          message.isError
                            ? 'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700'
                            : 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700'
                        }`}>
                          <p className={`text-center font-medium ${message.isError ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                            {message.text}
                          </p>
                        </div>
                    )}
                  </form>
              )}
            </div>

            <div className="flex justify-center mt-8">
              {isSuccess ? (
                  <></>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-6 max-w-md animate-slide-in-up" style={{ animationDelay: '500ms' }}>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 8a1 1 0 000 2h6a1 1 0 000-2H8zm1 5a1 1 0 11-2 0 1 1 0 012 0zm5-1a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Please upload:
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200 text-sm">
                    <li className="flex items-start gap-2">
                      <span>Student Identity card</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>Business certification (If any)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>Product(s) you sell</span>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </main>

          <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm animate-fade-in" style={{ animationDelay: '600ms' }}>
            <a
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-smooth hover:underline hover:underline-offset-4"
                href="https://www.shoptrixmart.com/"
                target="_blank"
                rel="noopener noreferrer"
            >
              <Image
                  aria-hidden
                  src="/trixmart-square-blue.png"
                  alt="TrixMart logo"
                  width={20}
                  height={20}
              />
              <span>TrixMart</span>
            </a>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            <a
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-smooth hover:underline hover:underline-offset-4"
                href="https://chat.whatsapp.com/E9fDd3thS80Ko35yKtZljW"
                target="_blank"
                rel="noopener noreferrer"
            >
              <Image
                  aria-hidden
                  src="/globe.svg"
                  alt="Globe icon"
                  width={16}
                  height={16}
              />
              <span>Join the Community →</span>
            </a>
          </footer>
        </div>

        <style jsx>{`
        .success-animation {
          width: 120px;
          height: 120px;
          animation: successBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }

        .checkmark__circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 2;
          stroke-miterlimit: 10;
          stroke: #10b981;
          fill: none;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.3));
        }

        .checkmark__check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          stroke: #10b981;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
          animation: stroke 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
        }

        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes successBounce {
          0% {
            transform: scale(0) rotate(-45deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
      `}</style>
      </>
  );
}