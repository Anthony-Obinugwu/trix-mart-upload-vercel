import React, { useState, useEffect } from "react";
import Image from "next/image";

const dropzone = ({
  name,
  id,
  isLoading,
  bgIsBlue,
  multipleFiles,
  allowedExtensions,
}) => {
  const [validatedFilesAndUrl, setValidatedFilesAndUrl] = useState([]);
  
    useEffect(() => {
      return () => {
        validatedFilesAndUrl.forEach(({ imageUrl }) => {
          if (imageUrl) URL.revokeObjectURL(imageUrl);
          console.log(imageUrl)
        });
      };
    }, [validatedFilesAndUrl]);


  const handleFileChange = (event) => {
    let addedFiles = event.target.files;
    
    // Check for the uploaded file
    if (addedFiles.length === 0) {
      console.log("Problem at uploaded check");
      return;
    }
    // validate number of files
    if (
      (multipleFiles && addedFiles.length !== 2) ||
      (!multipleFiles && addedFiles.length !== 1)
    ) {
      console.log("problem at number of files");
      return;
    }

    const validFilesAndUrl = [];
    Array(...addedFiles).forEach((file, index) => {
      // validate file extension
      if (
        !allowedExtensions.includes(file.name.split(".").pop().toLowerCase())
      ) {
        console.log("Problem at extension check");
        return;
      }
      // validate file size
      if (file.size > 5 * 1024 * 1024) {
        console.log("problem at file size");
      }
      // create preview link
      console.log(file)
      const objectUrl = URL.createObjectURL(file);
      console.log(objectUrl)
      validFilesAndUrl.push({ files: file, imageUrl: objectUrl })
    });
    // add files
    setValidatedFilesAndUrl([...validFilesAndUrl]);
    console.log([...validFilesAndUrl])
    // error handling
  };

  return (
    <div className="flex items-center justify-center w-full mb-4">
      <div id="header-and-dropzone" className="w-full">
        <div
          id="header-container"
          className={`text-center py-2 border-t-2 border-l-2 border-r-2 border-gray-600 rounded-t-xl ${bgIsBlue ? "text-blue-500" : "text-white"} dark:border-gray-300 dark:text-white ${bgIsBlue ? "dark:bg-blue-800": "dark:bg-purple-800 "} `}
        >
          {name}
        </div>
        <label
          htmlFor={id}
          className={`flex flex-col items-center justify-center w-full h-64 border-2 ${
            validatedFilesAndUrl.length ? "border-solid" : "border-dashed"
          } rounded-b-lg cursor-pointer bg-gray-50 hover:bg-gray-100 ${
            isLoading && "opacity-50"
          }`}
        >
          {validatedFilesAndUrl.length > 0 &&
          validatedFilesAndUrl[0].files ? (
            <div className="w-full h-full p-2">
              <div className={`${multipleFiles && "grid grid-cols-2 gap-4"} w-full h-full p-2 `}>
                {validatedFilesAndUrl[0].imageUrl ? (
                  multipleFiles ? (
                    validatedFilesAndUrl.map((item, index) => (
                     <div key={index} className="h-full rounded-lg overflow-hidden">
                       <Image
                       
                        src={`${item.imageUrl}`}
                        width={200}
                        height={200}
                        className="h-full"
                        alt=""
                      />
                     </div>
                    ))
                  ) : (
                    <div className="h-full rounded-lg overflow-hidden">
                      <Image
                      src={`${validatedFilesAndUrl[0].imageUrl}`}
                      height={200}
                      width={200}
                      className="object-cover object-center h-full w-full"
                      alt=""
                    />
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 rounded-lg p-2">
                    <svg
                      className="w-8 h-8 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-xs text-gray-700 truncate">
                      {validatedFilesAndUrl[0].files.name}
                    </span>
                  </div>
                )}
              </div>
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
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
            </div>
          )}
          <input
            id={id}
            type="file"
            className="hidden"
            name={id}
            // ref={`${name}InputRef`}
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png"
            multiple={multipleFiles}
            required
            disabled={isLoading}
          />
        </label>
      </div>
    </div>
  );
};

export default dropzone;
