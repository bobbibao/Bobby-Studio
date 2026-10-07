import { mode } from "@chakra-ui/theme-tools";
import { ThemeComponentProps } from "@chakra-ui/react";

const Button = {
  baseStyle: (props: ThemeComponentProps) => ({
    borderRadius: "10px",
    fontWeight: "500",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "brand.500",
      outlineOffset: "2px",
      boxShadow: "none",
    },
  }),
  variants: {
    primary: (props: ThemeComponentProps) => ({
      bg: "linear-gradient(135deg, #7F56D9 0%, #6D28D9 100%)",
      color: "white",
      boxShadow: "0 2px 10px rgba(127, 86, 217, 0.25)",
      _hover: {
        bg: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
        transform: "translateY(-1px)",
        boxShadow: "0 6px 20px -3px rgba(127, 86, 217, 0.45)",
        _disabled: {
          bg: "brand.600",
          transform: "none",
          boxShadow: "none",
        },
      },
      _active: {
        bg: "brand.800",
        transform: "translateY(0)",
      },
      _disabled: {
        bg: "brand.600",
        opacity: 0.45,
        cursor: "not-allowed",
        boxShadow: "none",
      },
    }),
    secondary: (props: ThemeComponentProps) => {
      const textColor = mode("zinc.900", "white")(props);
      return {
        border: "1px solid",
        borderColor: mode("zinc.300", "zinc.700")(props),
        bg: "transparent",
        color: textColor,
        _hover: {
          bg: mode("zinc.100", "zinc.800")(props),
          borderColor: mode("zinc.400", "zinc.600")(props),
        },
        _active: {
          bg: mode("zinc.200", "zinc.700")(props),
        },
      };
    },
    solid: (props: ThemeComponentProps) => ({
      bg: mode("zinc.900", "white")(props),
      color: mode("white", "zinc.950")(props),
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      _hover: {
        bg: mode("zinc.800", "zinc.100")(props),
        transform: "translateY(-1px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      },
      _active: {
        transform: "translateY(0)",
      },
      _disabled: {
        bg: mode("zinc.300", "zinc.600")(props),
        color: mode("zinc.500", "zinc.400")(props),
        transform: "none",
      },
    }),
    outline: (props: ThemeComponentProps) => ({
      border: "1px solid",
      borderColor: mode("zinc.200", "zinc.700")(props),
      bg: "transparent",
      color: mode("zinc.900", "white")(props),
      _hover: {
        bg: mode("zinc.100", "zinc.800")(props),
        borderColor: mode("brand.400", "brand.500")(props),
      },
      _active: {
        bg: mode("zinc.150", "zinc.750")(props),
      },
    }),
    ghost: (props: ThemeComponentProps) => ({
      bg: "transparent",
      color: mode("zinc.700", "zinc.300")(props),
      _hover: {
        bg: mode("zinc.100", "zinc.800")(props),
        color: mode("zinc.900", "white")(props),
      },
      _active: {
        bg: mode("zinc.150", "zinc.700")(props),
      },
    }),
    link: (props: ThemeComponentProps) => ({
      color: "brand.600",
      bg: "transparent",
      _hover: {
        textDecoration: "underline",
        color: "brand.500",
      },
    }),
  },
};

export default Button;
