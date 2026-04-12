import { ThemeComponentProps } from "@chakra-ui/react";
import { mode } from "@chakra-ui/theme-tools";

const Modal = {
  baseStyle: (props: ThemeComponentProps) => ({
    dialog: {
      bg: mode("white", "#1E1E1E")(props),
      color: mode("gray.800", "white")(props),
      borderRadius: "12px", // Added 12px radius
      overflow: "hidden", // Ensures child elements respect the border radius
    },
    header: {
      bg: "inherit", // Inherits from dialog bg
      borderBottom: "none", // Remove header separator
      fontSize: "lg",
      fontWeight: "semibold",
      px: 6,
      pt: 4,
      pb: 2,
      borderTopRadius: "12px", // Match parent radius
    },
    body: {
      bg: "inherit", // Inherits from dialog bg
      px: 6,
      py: 2,
    },
    footer: {
      bg: "inherit", // Inherits from dialog bg
      borderTop: "none", // Remove footer separator
      px: 6,
      pt: 4,
      pb: 4,
      borderBottomRadius: "12px", // Match parent radius
    },
    closeButton: {
      color: mode("gray.600", "gray.400")(props),
      _hover: {
        color: mode("gray.800", "white")(props),
      },
    },
  }),
};

export default Modal;
