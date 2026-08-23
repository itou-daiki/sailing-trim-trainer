# TRIM NOTE — Sailing Trim Trainer

420・470を対象に、風向・風速に合わせたセールトリムを学ぶ静的Webアプリです。

基本角度、乗員バランス、センターボードは常に最適と仮定し、風とコースに合わせてセール形状を作る操作へ集中します。タック、ジャイブ、レース戦術は扱いません。

Created by Dit-Lab.

公開版: [TRIM NOTE — 420 / 470 Sail Lab](https://itou-daiki.github.io/sailing-trim-trainer/)

## できること

- 真風と推定艇速から見かけ風を反復計算し、クローズのクラス基準・リーチの迎角15°・ブロードのシュラウド上限をつないだメイン基本角を自動設定
- 真風（TWA/TWS）→見かけ風（AWA/AWS）→ブーム角を同じバーに並べ、なぜ引く／出すのかを可視化
- バング、カニンガム、アウトホールを操作
- 420固有のチョック、ジブ高さを操作
- 470固有のフォア／アフタープラー、ジブリード前後を操作
- 420／470を別々の公式建造仕様図から座標化（船長・最大幅・マスト／ジブタック位置・平面輪郭・キール／シアー線・コックピット）
- 420 M-12／470 N17-L26の現行製品シルエットを16断面へ正規化し、クラス規則のラフ有効長・リーチ・フット・トップ幅・ジブ三辺・バテン構成で拘束
- 一つの陰影付き3D船体／セール面を上・斜め横・ブーム後端から前方のカメラへ同時表示し、操作盤の横で形を見ながらトリム
- 420／470のクラス別外側点寸法からブームを共通3D化し、後端ビューで端面と開口、ドラフト、ツイストを同時確認
- 現在形と基準形を三面図へ重ね、すべてのカメラで同じ頂点・同じドラフトストライプを比較
- 一本を動かす直前の形を自動保存し、三面図と断面へ「操作前」のゴーストとして重ねる
- 操作前後の深さ・最大ドラフト位置・ツイストを、変化方向と数値差で即時表示
- 入口角／出口角を含むセールメーカー型のストライプ計測
- 最大ドラフトを高さ方向へ結ぶ稜線と、共通の断面帯、現在／基準のマストベンド線を同時表示
- 操作したコントロールに応じて観察すべきメイン／ジブ・上／中／下を自動選択し、同じメッシュ断面を大きく表示
- ラフ、リーチ、コード、深さ、最大深さ位置を図中で直接測定
- 現在形、基準帯、数値差、前後／深浅の判定を同時表示
- 現在のずれから操作方向を含む修正順序を作り、調整中は固定して完了項目だけを外す
- 420／470の9つの段階式ドリルで、最初の一手を予想してから崩れた形状を修正
- 一本動かすたびに改善／悪化を判定し、迷い方に応じて観察場所→原理→具体操作の順でヒントを表示
- 完了数、挑戦回数、最少操作数を個人情報なしでブラウザ内に保存
- チャレンジをURLで共有し、チームや授業で同じ条件から比較
- 自由ラボの艇種・風向角・風速・全形状コントロールをURLで復元して比較

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

本アプリはリアルタイムCFDではありません。形状操作からドラフト・ツイスト・推定艇速までを学習用に結ぶ準定常の応答モデルです。基本角度、艇バランス、センターボードは自動で最適と仮定し、波、セールカット、艤装差による実艇差はモデル化していません。

メイン基本角は、真風ベクトルと現在の推定艇速を合成した見かけ風を使います。推定艇速→見かけ風→断面の前進力→推定艇速を収束まで反復し、リーチでは[Atterwind](https://github.com/flyinggorilla/simulator.atterwind.info)が公開する「見かけ風に対する迎角」の考え方から15°を学習用初期値に採用しました。クローズではこの単純式を使わず、[North Sails Japan 420 M-12 Tuning Guide](https://www.northsails.co.jp/wordpress/wp-content/uploads/2026/03/420-M12-Tuning-Guide_j.pdf)の「オーバーパワーでない限りセンター付近」と、[North Sails 470 Tuning Guide](https://colorcode.northsails.com/sailing/wp-content/uploads/2017/05/470_tuning_guide_e01.pdf)の「微風は中心線からブーム幅3〜4本、フルパワーは中心線、オーバーパワーで徐々に風下」へ校正します。ブロードではブームを代表シュラウド位置（420: 78°、470: 80°）より外へ出しません。これは唯一の実艇正解ではなく、風・艇速・方位の因果を学ぶ比較基準です。

メイン／ジブそれぞれに一つの3Dセール面があり、上部75%・中部50%・下部25%の計測断面から、0〜100%の全高へ深さ、最大深さ位置、ツイストを連続補間します。セール外形は420 M-12と470 N17-L26の公開製品シルエットを16断面へ正規化し、現行クラス規則の実寸上限で拘束します。ERSの1/4・1/2・3/4幅を同じ高さの水平コードとして扱わず、外形校正値として分離しています。メインの高さはリーチ長ではなく、クラス規則のマスト上下限間距離（420: 4900 mm、470: 5750 mm）を使います。

ジブはタックとヘッドを結ぶ固定ラフを回転軸とし、シート角を変えてもクラス規則のラフ・リーチ・フット三辺とトップ幅が変わらない3D基底で生成します。従来の水平回転では、シート角70°でリーチが420は約14.7%、470は約14.1%伸びる誤差がありました。現在は四隅の距離をテストで固定し、ラフをマストベンド後のメインラフへ接続しています。断面計測も画面上のXY距離ではなく、3Dコード基底上で深さ・最大位置・入口角・出口角を求めます。

船体はWorld Sailingの420 Building Specification Drawing 5 Issue Jと470 Building Specification Plan 470-003にある平面図・側面図を、420は12、470は11の異なる長手ステーションへ座標化しています。船長、最大幅、マスト、ジブタック、ブレークウォーター、コックピット開口を実寸で拘束し、断面間をフェアリングした共通3D船体です。三方向図は別々のイラストではなく、船体とセールの同じ頂点を異なるカメラ基底へ投影します。公開図面にないメーカー固有の型断面や製造CADを再現したものではありません。

ブームは現行クラス規則の外側点距離（420: 2400 mm、470: 2650 mm）へ固定し、規則の断面範囲内にある代表断面を使います。規則がメーカーごとの後端金具長を固定しないため、外側点より後ろの70 mmは後端面を学ぶための明示的な表示仮定です。後端ビューには開口と拡大断面を併記し、ブームとセール下端の接続を確認できます。

後端カメラは現在のブーム方位へ追従し、ブーム後端からマスト方向を見る正投影です。実寸ではドラフトが全高に比べて数ピクセルになるため、このビューだけ深さ方向を3倍表示し、画面内にも倍率を明記します。色、ドラフト稜線、上・中・下の断面線でメインとジブ、ツイスト、リーチの開きを読み分けます。各断面の揚力・抗力・前進力の代理値を高さ方向へ積分して適合度と推定艇速を算出し、操作優先順位は条件開始時の改善量で決め、調整中は順序を固定して基準範囲へ入った項目だけを外します。マスト曲がりは差を読み取れるよう強調した表示で、実艇のプリベンド実測値ではありません。用語は [`CONTEXT.md`](./CONTEXT.md) に定義しています。

基準づくりには以下を参照しています。

調査比較と採用判断は [`docs/product-research-2026-08.md`](./docs/product-research-2026-08.md) にまとめています。

- [North Sails — 420 Tuning Guide](https://www.northsails.com/en-fr/blogs/north-sails-blog/420-tuning-guide)
- [North Sails Japan — 420 M11 / M12 Tuning Guide](https://www.northsails.co.jp/wordpress/wp-content/uploads/2026/03/420-M12-Tuning-Guide_j.pdf)
- [World Sailing — International 420 Class Rules 2026](https://media.sailing.org/sailing/wp-content/uploads/2022/03/17092130/420_CR_2026-03-31.pdf)
- [World Sailing — 420 Building Specification, Drawing 5 Issue J](https://media.sailing.org/sailing/wp-content/uploads/2022/07/02133245/420_BuildingSpec_2022-09Sep-01.pdf)
- [World Sailing — International 470 Class Rules 2025](https://www.sailing.org/wp-content/uploads/2022/03/470_CR_2025-09-01-II.pdf)
- [World Sailing — 470 Building Specification Plan 470-003](https://media.sailing.org/sailing/wp-content/uploads/2023/01/19160058/470_005_080623_GA.pdf)
- [North Sails — 420 M-12 Mainsail](https://www.northsails.com/products/420-m-12-mainsail)
- [North Sails Japan — 470 sails](https://www.northsails.co.jp/one-design/od470/)
- [North Sails — 470 Speed Guide](https://www.northsails.com/en-ca/blogs/north-sails-blog/470-speed-guide)
- [North Sails — 470 N17-L26 Mainsail](https://www.northsails.com/products/470-n17-l26-mainsail)
- [World Sailing — Equipment Rules of Sailing 2025–2028](https://media.sailing.org/sailing/wp-content/uploads/2024/06/04011421/Equipment-Rules-of-Sailing-2025-2028-v.2.pdf)
- [World Sailing — 2025 Performance Scholarship 420 / 470 Tuning and Speed Guide](https://www.sailing.org/document/2025-performance-scholarship-420-470-tuning-and-speed-guide/)
- [Science of the 470 Sailing Performance](https://doksi.net/en/get.php?lid=34356)
- [UK Sailmakers — Draft Stripes](https://www.uksailmakers.com/racing/draft-stripes-2/)
- [Curtin University CMST — SailTool](https://cmst.curtin.edu.au/products/sailtool-software/)
- [NASA Glenn — The Lift Coefficient](https://www.grc.nasa.gov/WWW/k-12/FoilSim/Manual/fsim0007.htm)
- [NASA Glenn — Induced Drag Coefficient](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/induced-drag-coefficient/)

## 競合調査からの位置づけ

2026年8月時点で、次の公開製品・資料を比較しました。

- [SailRhythm](https://www.sailrhythm.com/) — VPPと回転可能な3Dセール形状
- [NauticEd NED](https://www.nauticed.org/sailing-simulator) — 風向角ごとのメイン／ジブ基本トリム
- [2Sail](https://www.2sail.net/) — テルテール、体重、バング等のゲーム型練習
- [North U Sail Trim Simulator](https://northu.com/sail-trim-simulator-user-guide/) — 複数ビュー、形状、艇速／VMG、優先操作の問い
- [Atterwind](https://github.com/flyinggorilla/simulator.atterwind.info) — 見かけの風、ツイスト、URL共有
- [ASA Sailing Challenge](https://americansailing.com/apps/sailing-challenge-app/) — 段階式モジュールとアワード
- [Sailaway](https://sailaway.world/aboutsa3) — 可視化された気流とリアルタイムのセール効率
- [Sail Simulator 5](https://www.sailsimulator.com/en/game-info/features) — 真風／見かけ風計器、風勾配、ツイスト、手動／自動トリム
- [eSail](https://www.esailyachtsimulator.com/live-sailing/) — 風・波・トリムを変えるサンドボックスと揚力／抗力の即時表示

TRIM NOTEは、汎用クルーザーやレースゲームではなく、**420/470固有のコントロール、三面図とドラフト断面、優先順位、形成的ドリル、共有可能な練習条件**を一つにまとめる点へ集中します。タック、ジャイブ、レース戦術は別アプリの範囲です。

## 品質基準

- Vitest: 82テスト（420／470別の船長・最大幅・マスト／ジブタック位置・船体ステーション、公式図面由来の共通3D船体、クラス別ブーム外側点・ブーム後端カメラ、真風＋艇速の見かけ風、加速時の自動シートイン、風速別クローズ／ビーム／シュラウド上限、全方位グリッドでの角度連続性、M-12／N17-L26の標本輪郭、公式ラフ有効長、全シート角でのジブ三辺・トップ幅不変、固定ラフ、全高の連続補間、バテン数、3D断面の幾何一致、入口／出口角、三カメラの頂点同一性、操作前差分、共有URL、420／470のマストベンド因果、固定優先順位、艇種・風向・風速・極端設定を横断する形状／空力不変条件を含む）
- Lighthouse 13（production build / mobile）: Performance 100、Accessibility 100、Best Practices 100、SEO 100
- FCP 1.4秒、LCP 1.5秒、TBT 0ms、CLS 0（production build / mobileのローカル計測値）
- `npm audit --omit=dev`: 既知の脆弱性0件
