# StackSift — 海外向けアフィリエイトサイト

英語圏向けの「ホスティング・VPN・ソフトウェア・お金系ツール」のガイド&レビューサイトです。
静的サイトなので **高速・安全・サーバー代ほぼ0円** で運用できます。

---

## 1. 中身の構成

```
site.config.json      ← サイト名・ドメイン・メールアドレス・カテゴリの設定(まずここを編集)
content/
  posts/              ← 記事(Markdown)。1ファイル = 1記事
    _review-template.md  ← レビュー記事のひな形(先頭が _ のファイルは公開されません)
  pages/              ← 固定ページ(About、アフィリエイト開示、プライバシーポリシー等)
  links.json          ← アフィリエイトリンクの一覧(/go/xxx/ で使う)
public/               ← CSS、ファビコン、OGP画像、セキュリティヘッダー
build.mjs             ← ビルドスクリプト(dist/ にサイトを出力)
templates.mjs         ← HTMLテンプレート(デザインを変えたい時に編集)
```

自動で生成されるもの: トップページ、記事一覧(ページ送り付き)、カテゴリページ、
`sitemap.xml`、`robots.txt`、RSS(`feed.xml`)、OGP/構造化データ(JSON-LD)、目次、関連記事、
全記事冒頭の「アフィリエイト開示」表示(米FTCガイドライン対応)。

---

## 2. 最初にやること(公開までの流れ)

### ステップ1:ドメイン名を決めて取得する

サイト名は仮に **StackSift** としています。好きな名前に変えてOKです。
候補(※空き状況は未確認です。取得前に必ず検索してください):

- `stacksift.com` / `toolverdict.com` / `sifttools.com` / `stackwiseguide.com`

おすすめの取得先は **Cloudflare Registrar**(更新料が上乗せなしの原価)。
次のステップで使う Cloudflare Pages と同じ管理画面で DNS 設定まで完結するので一番ラクです。
海外向けなら `.com` が無難です。

> ドメインの購入(支払い)はご自身で行ってください。

### ステップ2:サイト設定を書き換える

`site.config.json` を開いて次を変更します。

| 項目 | 内容 |
| --- | --- |
| `name` | サイト名 |
| `tagline` | キャッチコピー(英語) |
| `url` | 取得したドメイン(例: `https://www.yourdomain.com`) |
| `contactEmail` | 問い合わせ用メール(例: `hello@yourdomain.com`) |

サイト名を変えた場合は、SNSシェア用画像 `public/og-default.png`(1200×630)も差し替えてください。

### ステップ3:GitHub にアップロード

1. [GitHub](https://github.com) で無料アカウントを作り、新しいリポジトリ(Private可)を作成
2. このフォルダの中身をすべてアップロード(`node_modules` と `dist` は不要)

### ステップ4:Cloudflare Pages で公開

1. Cloudflare ダッシュボード → **Workers & Pages** → 作成 → **Pages** → 「Git に接続」
2. 先ほどのリポジトリを選択し、ビルド設定を以下にする

| 設定 | 値 |
| --- | --- |
| フレームワーク プリセット | None |
| ビルドコマンド | `npm install && npm run build` |
| ビルド出力ディレクトリ | `dist` |
| 環境変数 | `NODE_VERSION` = `22` |

3. 「保存してデプロイ」→ `xxxx.pages.dev` で表示されれば成功

※ Cloudflare の画面名称は変わることがあります。見当たらない場合は「Cloudflare Pages Git 連携」で検索してください。

### ステップ5:独自ドメインをつなぐ

1. Pages のプロジェクト → **カスタムドメイン** → `www.yourdomain.com` を追加
2. 同様に `yourdomain.com`(wwwなし)も追加
3. ドメインを Cloudflare で取得していれば DNS は自動設定。数分〜数時間で HTTPS 付きで表示されます

これ以降は **GitHub のファイルを更新するたびに自動で再公開** されます。

### ステップ6:公開後の設定

- **Google Search Console** にサイトを登録し、`https://yourdomain.com/sitemap.xml` を送信
- **アクセス解析(任意)**:Cloudflare Web Analytics のトークンを `site.config.json` の `analytics.cloudflareToken` に入れるだけ(Cookie不要)
- **問い合わせメール**:Cloudflare Email Routing を使うと `hello@yourdomain.com` 宛のメールを普段のアドレスに無料転送できます

---

## 3. 記事の書き方

`content/posts/` に `記事のURL名.md` というファイルを作ります。ファイル名がそのままURLになります。
(例:`best-vpn-for-travel.md` → `https://yourdomain.com/best-vpn-for-travel/`)

```markdown
---
title: Best VPN for Travel: 5 Options Compared
description: Google検索結果にも出る説明文(英語で150文字前後)
date: 2026-11-10
updated: 2026-12-01
category: vpn-privacy
featured: false
draft: false
---

ここから本文。## で見出し(3つ以上で目次が自動表示されます)。
```

- `category` は `hosting` / `vpn-privacy` / `software` / `money` のどれか(`site.config.json` で追加・変更可)
- `featured: true` にした記事がトップページの「Start here」枠に出ます
- `draft: true` の記事は公開されません
- レビュー記事は `_review-template.md` をコピーして使うと、価格ボタン・Pros/Cons・比較表・結論ボックスが揃った形で書けます

### アフィリエイトリンクの貼り方

1. ASP / 提携先の管理画面で発行されたリンクを `content/links.json` に登録

```json
{
  "surfvpn": "https://partner.example.com/?aff_id=YOUR_ID"
}
```

2. 記事内では `/go/surfvpn/` にリンクする

```markdown
[Get the deal](/go/surfvpn/)
```

こうしておくと:
- リンクに自動で `rel="sponsored nofollow"` が付きます(Google のガイドライン対応)
- 提携先URLが変わっても `links.json` を1か所直すだけで全記事に反映
- `/go/` は検索エンジンにインデックスされない設定済み

---

## 4. パソコンで確認する(任意)

[Node.js](https://nodejs.org)(v20以上)を入れて、このフォルダで:

```bash
npm install
npm run dev
```

→ ブラウザで http://localhost:8080 を開くとプレビューできます。

---

## 5. 海外アフィリエイトで注意すること

- **アフィリエイト開示**:米国FTCは開示を求めています。全記事の冒頭とフッターに自動表示済みです。消さないでください。
- **Amazon アソシエイト(米国)** に参加する場合は、`content/pages/affiliate-disclosure.md` にある定型文がそのまま使えます。
- **プライバシーポリシー・利用規約** はひな形です。使うサービス(解析ツール、メール配信など)が増えたら追記してください。法的な最終確認は専門家にご相談ください。
- **実際に使っていない商品を「テストした」と書かない**こと。信頼性と審査通過率に直結します。
- 金融系の記事には「一般的な情報であり投資助言ではない」旨を入れておくと安全です(利用規約にも記載済み)。

---

## 6. 主要な提携先の探し方(参考)

ホスティング・VPN・SaaS は、各社の公式サイト下部の「Affiliates」「Partners」から直接申し込めることが多いです。
複数社をまとめて扱うなら Impact、CJ Affiliate、PartnerStack、ShareASale/Awin などの海外ASPがあります。
多くの提携先は審査時に「記事がある程度あるか」を見るので、**まず5〜10記事公開してから申請**するのがおすすめです。
