import BubbleWindow from "./desktop/BubbleWindow"
import PanelWindow from "./desktop/PanelWindow"
import { isElectron } from "./desktop/bridge"

export default function App() {
  if (!isElectron()) return null
  return window.location.hash.startsWith("#bubble") ? (
    <BubbleWindow />
  ) : (
    <PanelWindow />
  )
}
