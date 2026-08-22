# TRIM NOTE — Sailing Trim Trainer

420・470を対象に、風向・風速に合わせたセールトリムを学ぶ静的Webアプリです。

基本角度、乗員バランス、センターボードは常に最適と仮定し、風とコースに合わせてセール形状を作る操作へ集中します。タック、ジャイブ、レース戦術は扱いません。

Created by Dit-Lab.

公開版: [TRIM NOTE — 420 / 470 Sail Lab](https://itou-daiki.github.io/sailing-trim-trainer/)

## できること

- 真風角と風速を変更し、基本角度を自動で合わせた後の形状差と推定艇速を比較
- バング、カニンガム、アウトホールを操作
- 420固有のチョック、ジブ高さを操作
- 470固有のフォア／アフタープラー、ジブリード前後を操作
- 上面・側面・後面の三面図で、基本角度・ドラフト・ツイストを同時比較
- メイン／ジブと上・中・下を選び、1本の断面を大きく表示
- ラフ、リーチ、コード、深さ、最大深さ位置を図中で直接測定
- 現在形、基準帯、数値差、前後／深浅の判定を同時表示
- 現在のずれから、操作方向を含む修正順序を影響の大きい順に表示
- 420／470の9つの段階式ドリルで、最初の一手を予想してから崩れた形状を修正
- 一本動かすたびに改善／悪化を判定し、迷い方に応じて観察場所→原理→具体操作の順でヒントを表示
- 完了数、挑戦回数、最少操作数を個人情報なしでブラウザ内に保存
- チャレンジをURLで共有し、チームや授業で同じ条件から比較

## 学習設計

ドリルは「状況を読む → 一手を予想 → 一本ずつ試す → 別条件へ」の順です。操作、ドラフト深さ、最大深さ位置、ツイスト、推定艇速を因果として読み直します。

- **内側のループ**: 一操作ごとに適合度の差、次の優先操作、原因別ヒントを返す
- **外側のループ**: 到達後は艇種・風速・風向角・対象コントロールが異なる次の条件へ進む
- **完了判定**: ボタンによる自己申告ではなく、指定条件で基準範囲へ到達したことを使う
- **比較方法**: World Sailingの420/470ガイドに沿い、一度に一変数だけ変え、設定と結果を記録する

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

本アプリはリアルタイムCFDではありません。形状操作からドラフト・ツイスト・推定艇速までを学習用に結ぶ簡易な準定常モデルです。基本角度、艇バランス、センターボードは自動で最適と仮定し、波、セールカット、艤装差による実艇差はモデル化していません。

基準づくりには以下を参照しています。

- [North Sails — 420 Tuning Guide](https://www.northsails.com/en-fr/blogs/north-sails-blog/420-tuning-guide)
- [North Sails — 470 Speed Guide](https://www.northsails.com/en-ca/blogs/north-sails-blog/470-speed-guide)
- [World Sailing — Level 3 420 / 470 Tuning and Speed Guide](https://media.sailing.org/sailing/wp-content/uploads/2025/10/22111828/420-470-Tuning-and-Speed-Guide.pdf)
- [Science of the 470 Sailing Performance](https://doksi.net/en/get.php?lid=34356)
- [UK Sailmakers — Draft Stripes](https://www.uksailmakers.com/racing/draft-stripes-2/)
- [Curtin University CMST — SailTool](https://cmst.curtin.edu.au/products/sailtool-software/)

## 競合調査からの位置づけ

2026年8月時点で、次の公開製品・資料を比較しました。

- [SailRhythm](https://www.sailrhythm.com/) — VPPと回転可能な3Dセール形状
- [NauticEd NED](https://www.nauticed.org/sailing-simulator) — 風向角ごとのメイン／ジブ基本トリム
- [2Sail](https://www.2sail.net/) — テルテール、体重、バング等のゲーム型練習
- [North U Sail Trim Simulator](https://northu.com/sail-trim-simulator-user-guide/) — 複数ビュー、形状、艇速／VMG、優先操作の問い
- [Atterwind](https://github.com/flyinggorilla/simulator.atterwind.info) — 見かけの風、ツイスト、URL共有
- [ASA Sailing Challenge](https://americansailing.com/apps/sailing-challenge-app/) — 段階式モジュールとアワード

TRIM NOTEは、汎用クルーザーやレースゲームではなく、**420/470固有のコントロール、三面図とドラフト断面、優先順位、形成的ドリル、共有可能な練習条件**を一つにまとめる点へ集中します。タック、ジャイブ、レース戦術は別アプリの範囲です。

## 品質基準

- Vitest: 28テスト
- Lighthouse 13（production build / mobile）: Performance 100、Accessibility 100、Best Practices 100、SEO 100
- FCP 1.4秒、LCP 1.4秒、TBT 0ms、CLS 0（ローカル計測値）
- `npm audit --omit=dev`: 既知の脆弱性0件
