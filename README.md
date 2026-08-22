# TRIM NOTE — Sailing Trim Trainer

420・470を対象に、風向・風速に合わせたセールトリムを学ぶ静的Webアプリです。

クローズのトリムのままビーム／ブロードへベアすると何が起きるかを起点に、コントロール、セール形状、空気力、艇の状態の因果関係を一画面で観察できます。タック、ジャイブ、レース戦術は扱いません。

## MVPでできること

- 真風角と風速を変更し、トリムを変えない場合の艇速・ヒール・リーウェイを比較
- メイン／ジブシート、バング、カニンガム、アウトホール、体重、センターボードを操作
- 420固有のチョック、ジブ高さ、風上ジブシートを操作
- 470固有のフォア／アフタープラー、ジブリード前後／内外を操作
- メインとジブの上・中・下3断面で、ドラフト深さ・最大深さの位置・ツイストを可視化
- 現在形と基準形を重ね、最優先の修正と理由を日本語で確認

## 開発

Node.js 24以降を使用します。

```bash
npm install
npm run dev
```

品質チェック:

```bash
npm test
npm run lint
npm run build
```

## GitHub Pages

Viteの `base` は `/sailing-trim-trainer/` に設定済みです。mainブランチへのpushで `.github/workflows/deploy.yml` がテスト・ビルド・Pages配信を行います。GitHubのリポジトリ設定で Pages の Source を **GitHub Actions** にしてください。

## モデルの位置づけ

このMVPはリアルタイムCFDではありません。操作から形、力、艇の状態までを学習用に結ぶ簡易な準定常モデルです。速度などは推定値で、波、クルー体重、セールカット、艤装差によって実艇の最適範囲は変わります。

基準づくりには以下を参照しています。

- [North Sails — 420 Tuning Guide](https://www.northsails.com/en-fr/blogs/north-sails-blog/420-tuning-guide)
- [North Sails — 470 Speed Guide](https://www.northsails.com/en-ca/blogs/north-sails-blog/470-speed-guide)
- [Science of the 470 Sailing Performance](https://doksi.net/en/get.php?lid=34356)
