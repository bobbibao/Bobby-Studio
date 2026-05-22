# chakra ui v2
Trong **Chakra UI v2**, `variants` là một tính năng giúp bạn tùy chỉnh giao diện của các **component** một cách linh hoạt bằng cách định nghĩa các biến thể (**variants**) khác nhau. Điều này giúp tái sử dụng code dễ dàng hơn và áp dụng các kiểu dáng khác nhau một cách có hệ thống.

---

## 🔹 **Cách sử dụng `variants` trong Chakra UI v2**
Mỗi **component** trong Chakra UI có thể hỗ trợ nhiều `variant`. Bạn có thể chọn `variant` bằng cách sử dụng thuộc tính `variant` khi sử dụng component.

### 📌 **Ví dụ với `Button`**
```tsx
import { Button } from "@chakra-ui/react";

function Example() {
  return (
    <Button variant="outline">Click me</Button>
  );
}
```
Ở đây, `variant="outline"` sẽ làm cho nút có viền thay vì nền đặc.
---

## 🔹 **Các `variants` mặc định**
Một số components phổ biến như `Button`, `Badge`, `Alert`, `Input` có sẵn nhiều `variant` mặc định.

Ví dụ với `Button`:
- `"solid"` (mặc định) → Nền đầy màu
- `"outline"` → Chỉ có viền
- `"ghost"` → Không có nền, chỉ có text
- `"link"` → Nhìn giống như một link
- `"unstyled"` → Loại bỏ hoàn toàn các style mặc định

```tsx
<Button variant="solid">Solid</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

---

## 🔹 **Tạo `variant` tùy chỉnh**
Bạn có thể mở rộng các `variants` mặc định bằng cách sử dụng **Chakra Theme**.

### 📌 **Ví dụ tạo `variant` mới cho `Button`**
Bạn có thể thêm một `variant` mới vào theme của mình:

```tsx
import { extendTheme } from "@chakra-ui/react";

const customTheme = extendTheme({
  components: {
    Button: {
      variants: {
        "custom-gradient": {
          bgGradient: "linear(to-r, teal.400, blue.500)",
          color: "white",
          _hover: {
            bgGradient: "linear(to-r, teal.500, blue.600)",
          },
        },
      },
    },
  },
});

export default customTheme;
```

Sau đó, bạn có thể sử dụng `variant="custom-gradient"` trong `Button`:

```tsx
<Button variant="custom-gradient">Custom Button</Button>
```

---

## 🔹 **Kết hợp `size`, `variant`, `colorScheme`**
Chakra UI cho phép bạn kết hợp `size`, `variant` và `colorScheme` để tạo ra nhiều kiểu giao diện khác nhau.

Ví dụ:
```tsx
<Button size="lg" variant="outline" colorScheme="teal">
  Large Outline Button
</Button>
```

---

## 🔹 **Tổng kết**
- `variant` giúp xác định các kiểu dáng khác nhau cho component.
- Các component như `Button`, `Input`, `Badge` có nhiều `variant` mặc định (`solid`, `outline`, `ghost`, v.v.).
- Bạn có thể mở rộng `variant` bằng cách sử dụng `extendTheme` để tạo giao diện tùy chỉnh.
- `variant` có thể kết hợp với `size` và `colorScheme` để tạo nhiều biến thể linh hoạt.

Bạn cần tạo `variant` tùy chỉnh cho component nào không? 🚀
