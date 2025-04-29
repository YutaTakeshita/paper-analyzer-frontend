"use client"

import { useState } from 'react'
import axios from 'axios'
import styles from './page.module.css'

export default function Home() {
  const [file, setFile] = useState(null)
  const [sections, setSections] = useState(null)
  // 目次用に全セクション名を取得
  const sectionNames = sections ? Object.keys(sections) : [];
  const [error, setError] = useState(null)
  const [summaries, setSummaries] = useState({});
  const [loadingSummaries, setLoadingSummaries] = useState({});
  const [audioUrls, setAudioUrls] = useState({});
  const [loadingAudio, setLoadingAudio] = useState({});

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) {
      setError('PDFファイルを選択してください')
      return
    }
    setError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/grobid/parse`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setSections(res.data.sections)
    } catch (err) {
      setError('アップロードまたは解析でエラーが発生しました')
      console.error(err)
    }
  }

  async function handleSummarize(name, text) {
    setLoadingSummaries(prev => ({ ...prev, [name]: true }));
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/summarize`,
        { text }
      );
      setSummaries(prev => ({ ...prev, [name]: res.data.summary }));
    } catch (err) {
      console.error(err);
      setSummaries(prev => ({ ...prev, [name]: '要約取得エラー' }));
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [name]: false }));
    }
  }

  async function handleTTS(name, text) {
    setLoadingAudio(prev => ({ ...prev, [name]: true }));
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/tts`,
        { text },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(new Blob([res.data], { type: 'audio/mpeg' }));
      setAudioUrls(prev => ({ ...prev, [name]: url }));
    } catch (err) {
      console.error("TTS failed:", err);
    } finally {
      setLoadingAudio(prev => ({ ...prev, [name]: false }));
    }
  }

  return (
    <main className={styles.main}>
      <h1>Paper Analyzer</h1>
      <p className={styles.description}>
        PDFをアップロードすると論文の各セクションを抽出して、要約や音声での再生を行うことができます。
      </p>
      <form onSubmit={handleUpload} className={styles.form}>
        <input
          type="file"
          accept="application/pdf"
          onChange={e => setFile(e.target.files[0])}
        />
        <button type="submit">Upload &amp; Parse</button>
      </form>
      {sectionNames.length > 0 && (
        <details className={styles.toc} open>
          <summary>目次（全{sectionNames.length}セクション）</summary>
          <ul>
            {sectionNames.map(name => (
              <li key={name}>
                <a href={`#${name}`}>{name}</a>
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {sections && (
        <div className={styles.results}>
          {Object.entries(sections).map(([name, text]) => (
            <section key={name} id={name} className={styles.section}>
              <h2>{name}</h2>
              <p>{text.slice(0, 200)}…</p>
              <button
                className={styles.summaryButton}
                onClick={() => handleSummarize(name, text)}
                disabled={loadingSummaries[name]}
              >
                {loadingSummaries[name] ? '要約中...' : '要約'}
              </button>
              {summaries[name] && (
                <p className={styles.summaryText}>{summaries[name]}</p>
              )}
              <div className={styles.ttsContainer}>
                <button
                  className={styles.ttsButton}
                  onClick={() => handleTTS(name, summaries[name] || text)}
                  disabled={loadingAudio[name] || !(summaries[name] || text)}
                >
                  {loadingAudio[name] ? '生成中...' : '音声 ▶'}
                </button>
                {audioUrls[name] && (
                  <audio controls src={audioUrls[name]} />
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
