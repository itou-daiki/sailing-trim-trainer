export function courseName(angle: number) {
  if (angle < 66) return 'クローズ'
  if (angle < 112) return 'ビームリーチ'
  return 'ブロードリーチ'
}
