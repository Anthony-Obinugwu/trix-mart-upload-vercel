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
};

export default function Home() {
  const [studentId, setStudentId] = useState<string>("");
  const [filesWithPreviews, setFilesWithPreviews] = useState<FileWithPreview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [message, setMessage] = useState<UploadMessage>({ text: "", isError: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CLOUD_NAME = 'dega42p1c';
  const UPLOAD_PRESET = 'student_id_uploads';

  useEffect(() => {
    return () => {
      filesWithPreviews.forEach(({ preview }) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [filesWithPreviews]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (filesWithPreviews.length + selectedFiles.length > 5) {
      setMessage({ text: "❌ Maximum 5 files allowed", isError: true });
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
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      });
    });

    if (invalidMessages.length > 0) {
      setMessage({ text: `❌ ${invalidMessages.join(' ')}`, isError: true });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFilesWithPreviews(prev => [...prev, ...validFiles]);
    setMessage({ text: "", isError: false });
  };

  const uploadToCloudinary = async (file: File, studentId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('public_id', `student_ids/${studentId}/${file.name}`);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!filesWithPreviews.length || !studentId) {
      setMessage({ text: "❌ Please fill all fields", isError: true });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "", isError: false });

    try {
      await Promise.all(
          filesWithPreviews.map(({ file }) => uploadToCloudinary(file, studentId))
      );

      setIsSuccess(true);
      setStudentId("");
      setFilesWithPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setMessage({
        text: `❌ Error: ${err instanceof Error ? err.message : "Upload failed"}`,
        isError: true,
      });
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
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
          <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
            <div id="upload-container" className="flex flex-col items-center w-96 py-8 px-6 border-2 border-gray-400 border-solid rounded-3xl">
              <Image
                  src="/trix-mart-text-and-logo.png"
                  className="mb-12"
                  width={200}
                  height={36}
                  alt="TrixMart Logo"
                  priority
              />

              {isSuccess ? (
                  <div className="flex flex-col items-center">
                    <div className="success-animation mb-6">
                      <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Welcome to TrixMart</h2>
                  </div>
              ) : (
                  <form onSubmit={handleSubmit} className="w-full">
                    <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
                        className="py-2 px-4 mb-4 w-full outline-none border-solid border-gray-300 border-2 focus:border-blue-500 rounded-xl"
                        placeholder="Student ID"
                        required
                        pattern="\d*"
                        disabled={isLoading}
                    />

                    <div className="flex items-center justify-center w-full">
                      <label
                          htmlFor="dropzone-file"
                          className={`flex flex-col items-center justify-center w-full h-64 border-2 ${filesWithPreviews.length ? 'border-solid' : 'border-dashed'} rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 ${isLoading ? 'opacity-50' : ''}`}
                      >
                        {filesWithPreviews.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4 w-full h-64 p-2 overflow-y-auto">
                              {filesWithPreviews.map(({ file, preview }, index) => (
                                  <div key={index} className="relative h-40">
                                    {preview ? (
                                        <Image
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            fill
                                            className="object-cover rounded-lg"
                                            sizes="(max-width: 768px) 100vw, 384px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 rounded-lg p-2">
                                          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <span className="text-xs text-gray-700 truncate">{file.name}</span>
                                        </div>
                                    )}
                                  </div>
                              ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                              </svg>
                              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 5MB)</p>
                            </div>
                        )}
                        <input
                            id="dropzone-file"
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf"
                            required
                            multiple
                            disabled={isLoading}
                        />
                      </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Uploading...' : 'Upload ID'}
                    </button>

                    {message.text && (
                        <p className={`mt-4 text-center ${message.isError ? 'text-red-500' : 'text-green-500'}`}>
                          {message.text}
                        </p>
                    )}
                  </form>
              )}
            </div>

            <div className="text-center text-gray-600">
              {isSuccess ? (
                  <p></p>
              ) : (
                  <>
                    <p className="font-semibold">Please Upload:</p>
                    <p>1. Your student ID</p>
                    <p>2. Product photos</p>
                  </>
              )}
            </div>
          </main>

          <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
            <a
                className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                href="https://www.shoptrixmart.com/"
                target="_blank"
                rel="noopener noreferrer"
            >
              <Image
                  aria-hidden
                  src="/trixmart-square-blue.png"
                  alt="File icon"
                  width={20}
                  height={20}
              />
              TrixMart
            </a>
            <a
                className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
            >
              <Image
                  aria-hidden
                  src="/window.svg"
                  alt="Window icon"
                  width={16}
                  height={16}
              />
              Terms and Conditions
            </a>
            <a
                className="flex items-center gap-2 hover:underline hover:underline-offset-4"
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
              Join the Community →
            </a>
          </footer>
        </div>

        <style jsx>{`
        .success-animation {
          width: 100px;
          height: 100px;
        }
        
        .checkmark__circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 2;
          stroke-miterlimit: 10;
          stroke: #4CAF50;
          fill: none;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }

        .checkmark__check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
        }

        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      </>
  );
}