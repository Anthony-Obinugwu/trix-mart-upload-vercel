'use client'
import {ChangeEvent, FormEvent, useState, useRef, useEffect} from "react";
import Image from "next/image";
import Head from "next/head";


type UploadMessage = {
  text: string;
  isError: boolean;
};

export default function Home() {
  const [studentId, setStudentId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<UploadMessage>({
    text: "",
    isError: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const savedId = localStorage.getItem('whatsappStudentId');
    if (savedId) {
      setStudentId(savedId);
      localStorage.removeItem('whatsappStudentId'); // Clear after use
    }
  }, []);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080" || "http://localhost:3000";

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;``

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'gif', 'webp', 'svg'];

    if (!extension || !allowedExtensions.includes(extension)) {
      setMessage({ text: "❌ Invalid file type. Allowed: " + allowedExtensions.join(', '), isError: true });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setMessage({ text: "❌ File too large (max 5MB)", isError: true });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    setMessage({ text: "", isError: false });

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleStudentIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setStudentId(value);
  };

// Replace handleSubmit with this Firebase-compatible version:
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !studentId) {
      setMessage({ text: "❌ Please fill all fields", isError: true });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "", isError: false });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('studentId', studentId);

      const response = await fetch(`${API_BASE_URL}/api/students/upload-id`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Upload failed");
      }

      // Notify WhatsApp bot
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BOT_URL}/upload-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: Number(studentId) }),
        });
      } catch (notificationError) {
        console.error("Failed to notify WhatsApp bot:", notificationError);
      }

      setMessage({ text: "✅ Upload successful!", isError: false });
      setStudentId("");
      setFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setMessage({
        text: `❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`,
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
            <div
                id="upload-container"
                className="flex flex-col items-center w-96 py-8 px-6 border-2 border-gray-400 border-solid rounded-3xl"
            >
              <Image
                  src="/trix-mart-text-and-logo.png"
                  className="mb-12"
                  width={200}
                  height={36}
                  alt="TrixMart Logo"
              />

              <form onSubmit={handleSubmit} className="w-full">
                <input
                    type="text"
                    value={studentId}
                    onChange={handleStudentIdChange}
                    className="py-2 px-4 mb-4 w-full outline-none border-solid border-gray-300 border-2 focus:border-blue-500 rounded-xl"
                    placeholder="Student ID"
                    required
                    pattern="\d*"
                />

                <div className="flex items-center justify-center w-full">
                  <label
                      htmlFor="dropzone-file"
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    {filePreview ? (
                        <div className="relative w-full h-full">
                          <Image
                              src={filePreview}
                              alt="Preview"
                              fill
                              className="object-contain p-2"
                          />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg
                              className="w-8 h-8 mb-4 text-gray-500"
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 20 16"
                          >
                            <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                            />
                          </svg>
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            {file ? file.name : 'PNG, JPG, PDF (MAX. 5MB)'}
                          </p>
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
                    />
                  </label>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Uploading...' : 'Upload ID'}
                </button>

                {message.text && (
                    <p className={`mt-4 text-center ${message.isError ? 'text-red-500' : 'text-green-500'}`}>
                      {message.text}
                    </p>
                )}
              </form>
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
                href=""
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
      </>
  );
}