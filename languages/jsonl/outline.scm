; A non-empty object is named after the key of its first pair.
(document
  (object
    .
    (pair
      key: (string) @name)) @item)

; Empty objects use their own text as the label. The anchor between the
; braces admits no named child, i.e. no pairs.
(document
  (object
    .
    "{"
    .
    "}"
    .) @name @item)

(document
  [
    (array)
    (string)
    (number)
    (true)
    (false)
    (null)
  ] @name @item)
