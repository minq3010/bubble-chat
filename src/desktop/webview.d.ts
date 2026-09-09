import type React from "react";

// Allow the Electron <webview> tag in JSX / createElement typing.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          partition?: string;
          allowpopups?: string;
          useragent?: string;
          preload?: string;
        },
        HTMLElement
      >;
    }
  }
}
