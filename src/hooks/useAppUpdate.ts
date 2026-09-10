import { useCallback, useEffect, useState } from "react";
import { desktop, type UpdateInfo } from "../desktop/bridge";

const initialUpdateInfo: UpdateInfo = { status: "idle", currentVersion: "" };

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>(initialUpdateInfo);

  useEffect(() => {
    let mounted = true;
    void desktop()?.getUpdateInfo().then((info) => mounted && setUpdateInfo(info));
    const off = desktop()?.onUpdateStatus((info) => mounted && setUpdateInfo(info));
    return () => {
      mounted = false;
      off?.();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    const info = await desktop()?.checkForUpdates();
    if (info) setUpdateInfo(info);
  }, []);

  const openUpdateDownload = useCallback(() => desktop()?.openUpdateDownload(), []);

  return { updateInfo, checkForUpdates, openUpdateDownload };
}
