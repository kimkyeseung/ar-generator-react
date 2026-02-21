import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import QRCode from "qrcode";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./components/ui/button";

export function QRCodePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();

  // 디버그 모드 상태
  const [isDebugMode, setIsDebugMode] = useState(false);

  // QR 코드에 사용될 URL (디버그 모드일 때 쿼리 추가)
  const baseUrl = `${window.location.origin}/result/${folderId}`;
  const fullUrl = isDebugMode ? `${baseUrl}?mode=debug` : baseUrl;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, fullUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
    }
  }, [fullUrl]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = isDebugMode ? "ar-qrcode-debug.png" : "ar-qrcode.png";
      link.href = url;
      link.click();
    }
  };

  // 디버그 모드 토글
  const handleDebugClick = () => {
    setIsDebugMode(prev => !prev);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* 숨겨진 디버그 버튼 (좌측 하단, 모바일에서 숨김) */}
      <button
        type="button"
        onClick={handleDebugClick}
        className="fixed bottom-0 left-0 w-[50px] h-[50px] cursor-pointer opacity-0 hidden md:block"
        aria-label="Debug mode"
      />
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="-ml-2 mb-6 text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>

        <div className="text-center">
          <h1 className="mb-2 text-gray-900">게시 완료!</h1>
          <p className="mb-8 text-gray-600">
            QR 코드를 스캔하여 AR 콘텐츠를 확인하세요
          </p>

          <div className="mb-8 flex justify-center">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <canvas ref={canvasRef} className="mx-auto" />
            </div>
          </div>

          <Button
            onClick={() => {
              navigate(`/result/${folderId}${isDebugMode ? '?mode=debug' : ''}`);
            }}
            className="w-full"
          >
            이동하기
          </Button>

          <Button
            variant={"outline"}
            onClick={handleDownload}
            className="text-gray-500"
          >
            <Download />
            다운로드
          </Button>

          <p className="mt-4 break-all text-sm text-gray-500">{fullUrl}</p>
        </div>
      </div>
    </div>
  );
}
