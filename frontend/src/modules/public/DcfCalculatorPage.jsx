import DcfCalculator from './components/DcfCalculator';

export default function DcfCalculatorPage() {
  return (
    <section className="panel public-section">
      <p className="eyebrow">Kalkulator DCF</p>
      <h1>Gunakan DCF untuk menyusun ekspektasi, lalu uji apakah harga pasar masih masuk akal.</h1>
      <p className="subtitle">
        Input dihitung di frontend dengan proyeksi lima tahun. Pastikan discount rate lebih besar dari terminal growth rate.
      </p>
      <DcfCalculator />
    </section>
  );
}
