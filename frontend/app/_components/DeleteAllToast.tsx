import toast from "react-hot-toast";

type DeleteAllToastProps = {
  onConfirm: () => Promise<void>;
  toastId: string;
};

export function DeleteAllToast({ onConfirm, toastId }: DeleteAllToastProps) {
  return (
    <div className="grid max-w-[min(360px,calc(100vw-32px))] gap-3.5">
      <div className="grid gap-1">
        <strong className="text-sm font-bold leading-[1.4] text-ink">
          Hapus seluruh riwayat dan output?
        </strong>
        <p className="text-[13px] leading-normal text-muted">
          Semua job dan file video di folder outputs akan dihapus.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          className="min-h-[34px] cursor-pointer rounded-lg border border-line bg-transparent px-3 text-[13px] font-bold text-ink transition hover:bg-canvas"
          type="button"
          onClick={() => toast.dismiss(toastId)}
        >
          Batal
        </button>
        <button
          className="min-h-[34px] cursor-pointer rounded-lg border border-danger bg-danger px-3 text-[13px] font-bold text-white transition hover:brightness-95"
          type="button"
          onClick={async () => {
            toast.dismiss(toastId);
            await onConfirm();
          }}
        >
          Hapus Semua
        </button>
      </div>
    </div>
  );
}
