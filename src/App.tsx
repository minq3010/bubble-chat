import BubbleWindow from "./desktop/BubbleWindow"
import PanelWindow from "./desktop/PanelWindow"
import ToastWindow from "./desktop/ToastWindow"
import { isElectron } from "./desktop/bridge"

export default function App() {
  if (!isElectron()) return null
  if (window.location.hash.startsWith("#bubble")) {
    return <BubbleWindow />
  }
  if (window.location.hash.startsWith("#toast")) {
    return <ToastWindow />
  }
  return <PanelWindow />
}
