import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import { client, storage, account } from "./lib/appwrite";
import { AppwriteException, ID, Permission, Role } from "appwrite";
import AppwriteSvg from "../public/appwrite.svg";
import ReactSvg from "../public/react.svg";

function App() {
  const [detailHeight, setDetailHeight] = useState(55);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("idle");
  const [showLogs, setShowLogs] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [selectedFile, setSelectedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [listFilesStatus, setListFilesStatus] = useState("idle");
  const [user, setUser] = useState(null);
  const [loginStatus, setLoginStatus] = useState("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const detailsRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    account.get().then(setUser).catch(() => setUser(null));
  }, []);

  const updateHeight = useCallback(() => {
    if (detailsRef.current) {
      setDetailHeight(detailsRef.current.clientHeight);
    }
  }, [logs, showLogs]);

  useEffect(() => {
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [updateHeight]);

  useEffect(() => {
    if (!detailsRef.current) return;
    detailsRef.current.addEventListener("toggle", updateHeight);

    return () => {
      if (!detailsRef.current) return;
      detailsRef.current.removeEventListener("toggle", updateHeight);
    };
  }, []);

  async function login(e) {
    e.preventDefault();
    if (loginStatus === "loading") return;
    setLoginStatus("loading");
    try {
      const result = await account.createEmailPasswordSession({ email, password });
      const log = {
        date: new Date(),
        method: "POST",
        path: "/v1/account/sessions/email",
        status: 201,
        response: JSON.stringify({ sessionId: result.$id, userId: result.userId }),
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
      setUser(await account.get());
      setLoginStatus("success");
      setEmail("");
      setPassword("");
    } catch (err) {
      const log = {
        date: new Date(),
        method: "POST",
        path: "/v1/account/sessions/email",
        status: err instanceof AppwriteException ? err.code : 500,
        response: err instanceof AppwriteException ? err.message : "Something went wrong",
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
      setLoginStatus("error");
    }
    setShowLogs(true);
  }

  async function logout() {
    try {
      await account.deleteSession({ sessionId: "current" });
      const log = {
        date: new Date(),
        method: "DELETE",
        path: "/v1/account/sessions/current",
        status: 204,
        response: "Session deleted",
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
      setUser(null);
      setLoginStatus("idle");
    } catch (err) {
      const log = {
        date: new Date(),
        method: "DELETE",
        path: "/v1/account/sessions/current",
        status: err instanceof AppwriteException ? err.code : 500,
        response: err instanceof AppwriteException ? err.message : "Something went wrong",
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
    }
    setShowLogs(true);
  }

  async function listFiles() {
    if (listFilesStatus === "loading") return;
    setListFilesStatus("loading");
    const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;
    try {
      const result = await storage.listFiles({ bucketId });
      const log = {
        date: new Date(),
        method: "GET",
        path: `/v1/storage/buckets/${bucketId}/files`,
        status: 200,
        response: JSON.stringify({ total: result.total }),
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
      setFiles(result.files);
      setListFilesStatus("success");
    } catch (err) {
      const log = {
        date: new Date(),
        method: "GET",
        path: `/v1/storage/buckets/${bucketId}/files`,
        status: err instanceof AppwriteException ? err.code : 500,
        response: err instanceof AppwriteException ? err.message : "Something went wrong",
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
      setListFilesStatus("error");
    }
    setShowLogs(true);
  }

  async function uploadFile() {
    if (!selectedFile || uploadStatus === "loading") return;
    setUploadStatus("loading");
    const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;
    try {
      const result = await storage.createFile({ bucketId, fileId: ID.unique(), file: selectedFile, permissions: [Permission.read(Role.any())] });
      const log = {
        date: new Date(),
        method: "POST",
        path: `/v1/storage/buckets/${bucketId}/files`,
        status: 201,
        response: JSON.stringify({ fileId: result.$id, name: result.name }),
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
      setUploadStatus("success");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await listFiles();
    } catch (err) {
      const log = {
        date: new Date(),
        method: "POST",
        path: `/v1/storage/buckets/${bucketId}/files`,
        status: err instanceof AppwriteException ? err.code : 500,
        response:
          err instanceof AppwriteException ? err.message : "Something went wrong",
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
      setUploadStatus("error");
    }
    setShowLogs(true);
  }

  async function sendPing() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      const result = await client.ping();
      const log = {
        date: new Date(),
        method: "GET",
        path: "/v1/ping",
        status: 200,
        response: JSON.stringify(result),
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
      setStatus("success");
    } catch (err) {
      const log = {
        date: new Date(),
        method: "GET",
        path: "/v1/ping",
        status: err instanceof AppwriteException ? err.code : 500,
        response:
          err instanceof AppwriteException
            ? err.message
            : "Something went wrong",
      };
      setLogs((prevLogs) => [log, ...prevLogs]);
      setStatus("error");
    }
    setShowLogs(true);
  }

  return (
    <main
      className="checker-background flex flex-col items-center p-5"
      style={{ marginBottom: `${detailHeight}px` }}
    >
      <div className="mt-25 flex w-full max-w-[40em] items-center justify-center lg:mt-34">
        <div className="rounded-[25%] border border-[#19191C0A] bg-[#F9F9FA] p-3 shadow-[0px_9.36px_9.36px_0px_hsla(0,0%,0%,0.04)]">
          <div className="rounded-[25%] border border-[#FAFAFB] bg-white p-5 shadow-[0px_2px_12px_0px_hsla(0,0%,0%,0.03)] lg:p-9">
            <img
              alt={"React logo"}
              src={ReactSvg}
              className="h-14 w-14"
              width={56}
              height={56}
            />
          </div>
        </div>
        <div
          className={`flex w-38 items-center transition-opacity duration-2500 ${status === "success" ? "opacity-100" : "opacity-0"}`}
        >
          <div className="to-[rgba(253, 54, 110, 0.15)] h-[1px] flex-1 bg-gradient-to-l from-[#f02e65]"></div>
          <div className="icon-check flex h-5 w-5 items-center justify-center rounded-full border border-[#FD366E52] bg-[#FD366E14] text-[#FD366E]"></div>
          <div className="to-[rgba(253, 54, 110, 0.15)] h-[1px] flex-1 bg-gradient-to-r from-[#f02e65]"></div>
        </div>
        <div className="rounded-[25%] border border-[#19191C0A] bg-[#F9F9FA] p-3 shadow-[0px_9.36px_9.36px_0px_hsla(0,0%,0%,0.04)]">
          <div className="rounded-[25%] border border-[#FAFAFB] bg-white p-5 shadow-[0px_2px_12px_0px_hsla(0,0%,0%,0.03)] lg:p-9">
            <img
              alt={"Appwrite logo"}
              src={AppwriteSvg}
              className="h-14 w-14"
              width={56}
              height={56}
            />
          </div>
        </div>
      </div>

      <section className="mt-12 flex h-52 flex-col items-center">
        {status === "loading" ? (
          <div className="flex flex-row gap-4">
            <div role="status">
              <svg
                aria-hidden="true"
                className="h-5 w-5 animate-spin fill-[#FD366E] text-gray-200 dark:text-gray-600"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
              <span className="sr-only">Loading...</span>
            </div>
            <span>Waiting for connection...</span>
          </div>
        ) : status === "success" ? (
          <h1 className="font-[Poppins] text-2xl font-light text-[#2D2D31]">
            Congratulations!
          </h1>
        ) : (
          <h1 className="font-[Poppins] text-2xl font-light text-[#2D2D31]">
            Check connection
          </h1>
        )}

        <p className="mt-2 mb-8">
          {status === "success" ? (
            <span>You connected your app successfully.</span>
          ) : status === "error" || status === "idle" ? (
            <span>Send a ping to verify the connection</span>
          ) : null}
        </p>

        <button
          onClick={sendPing}
          className={`cursor-pointer rounded-md bg-[#FD366E] px-2.5 py-1.5 ${status === "loading" ? "hidden" : "visible"}`}
        >
          <span className="text-white">Send a ping</span>
        </button>

        <div className="mt-6 flex flex-col items-center gap-3">
          <h2 className="font-[Poppins] text-lg font-light text-[#2D2D31]">Account</h2>
          {user ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-[#2D2D31]">Logged in as <strong>{user.email}</strong></span>
              <button
                onClick={logout}
                className="cursor-pointer rounded-md border border-[#FD366E] px-2.5 py-1.5 text-[#FD366E]"
              >
                Log out
              </button>
            </div>
          ) : (
            <form onSubmit={login} className="flex flex-col gap-2 w-64">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-md border border-[#EDEDF0] px-3 py-1.5 text-sm outline-none focus:border-[#FD366E]"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-md border border-[#EDEDF0] px-3 py-1.5 text-sm outline-none focus:border-[#FD366E]"
              />
              <button
                type="submit"
                disabled={loginStatus === "loading"}
                className="cursor-pointer rounded-md bg-[#FD366E] px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-white">
                  {loginStatus === "loading" ? "Logging in..." : "Log in"}
                </span>
              </button>
              {loginStatus === "error" && (
                <span className="text-sm text-[#B31212] text-center">Login failed. Check logs.</span>
              )}
            </form>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <h2 className="font-[Poppins] text-lg font-light text-[#2D2D31]">Upload a file</h2>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="text-sm text-[#2D2D31] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#FD366E] file:px-2.5 file:py-1.5 file:text-white"
          />
          <button
            onClick={uploadFile}
            disabled={!selectedFile || uploadStatus === "loading"}
            className="cursor-pointer rounded-md bg-[#FD366E] px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-white">
              {uploadStatus === "loading" ? "Uploading..." : "Upload to Storage"}
            </span>
          </button>
          {uploadStatus === "success" && (
            <span className="text-sm text-[#0A714F]">File uploaded successfully!</span>
          )}
          {uploadStatus === "error" && (
            <span className="text-sm text-[#B31212]">Upload failed. Check logs.</span>
          )}
        </div>

        <div className="mt-6 flex w-full max-w-[40em] flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-[Poppins] text-lg font-light text-[#2D2D31]">Storage files</h2>
            <button
              onClick={listFiles}
              disabled={listFilesStatus === "loading"}
              className="cursor-pointer rounded-md bg-[#FD366E] px-2.5 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-white">{listFilesStatus === "loading" ? "Loading..." : "Refresh"}</span>
            </button>
          </div>
          {files.length === 0 ? (
            <p className="text-sm text-[#97979B]">
              {listFilesStatus === "idle" ? "Click Refresh to load files." : "No files found."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {files.map((file) => (
                <li
                  key={file.$id}
                  className="flex items-center justify-between rounded-md border border-[#EDEDF0] bg-white px-4 py-2 text-sm"
                >
                  <span className="truncate text-[#2D2D31]">{file.name}</span>
                  <span className="ml-4 shrink-0 text-[#97979B]">{(file.sizeOriginal / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>


      <aside className="fixed bottom-0 flex w-full cursor-pointer border-t border-[#EDEDF0] bg-white">
        <details open={showLogs} ref={detailsRef} className={"w-full"}>
          <summary className="flex w-full flex-row justify-between p-4 marker:content-none">
            <div className="flex gap-2">
              <span className="font-semibold">Logs</span>
              {logs.length > 0 && (
                <div className="flex items-center rounded-md bg-[#E6E6E6] px-2">
                  <span className="font-semibold">{logs.length}</span>
                </div>
              )}
            </div>
            <div className="icon">
              <span className="icon-cheveron-down" aria-hidden="true"></span>
            </div>
          </summary>
          <div className="flex w-full flex-col lg:flex-row">
            <div className="flex flex-col border-r border-[#EDEDF0]">
              <div className="border-y border-[#EDEDF0] bg-[#FAFAFB] px-4 py-2 text-[#97979B]">
                Project
              </div>
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="flex flex-col">
                  <span className="text-[#97979B]">Endpoint</span>
                  <span className="truncate">
                    {import.meta.env.VITE_APPWRITE_ENDPOINT}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#97979B]">Project-ID</span>
                  <span className="truncate">
                    {import.meta.env.VITE_APPWRITE_PROJECT_ID}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#97979B]">Project name</span>
                  <span className="truncate">
                    {import.meta.env.VITE_APPWRITE_PROJECT_NAME}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-grow">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-[#EDEDF0] bg-[#FAFAFB] text-[#97979B]">
                    {logs.length > 0 ? (
                      <>
                        <td className="w-52 py-2 pl-4">Date</td>
                        <td>Status</td>
                        <td>Method</td>
                        <td className="hidden lg:table-cell">Path</td>
                        <td className="hidden lg:table-cell">Response</td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pl-4">Logs</td>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr>
                        <td className="py-2 pl-4 font-[Fira_Code]">
                          {log.date.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>
                          {log.status > 400 ? (
                            <div className="w-fit rounded-sm bg-[#FF453A3D] px-1 text-[#B31212]">
                              {log.status}
                            </div>
                          ) : (
                            <div className="w-fit rounded-sm bg-[#10B9813D] px-1 text-[#0A714F]">
                              {log.status}
                            </div>
                          )}
                        </td>
                        <td>{log.method}</td>
                        <td className="hidden lg:table-cell">{log.path}</td>
                        <td className="hidden font-[Fira_Code] lg:table-cell">
                          {log.response}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2 pl-4 font-[Fira_Code]">
                        There are no logs to show
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </aside>
    </main>
  );
}

export default App;
