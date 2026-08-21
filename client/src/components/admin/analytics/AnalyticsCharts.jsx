import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatInrFromPaise } from '../../../utils/money.js';

const AXIS_TICK = {
  fill: '#737373',
  fontSize: 11,
};

const CHART_GRID = '#e5e5e5';

const STATUS_COLORS = {
  placed: '#2563eb',
  confirmed: '#4f46e5',
  processing: '#d97706',
  shipped: '#7c3aed',
  delivered: '#15803d',
  cancelled: '#dc2626',
};

const compactMoneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('en-IN');

function formatCompactMoney(paise) {
  if (!Number.isFinite(Number(paise))) {
    return '—';
  }

  return compactMoneyFormatter.format(Number(paise) / 100);
}

function formatLabel(value) {
  if (!value) {
    return 'Unknown';
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatPeriod(period) {
  if (!period) {
    return '';
  }

  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split('-').map(Number);

    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [year, month, day] = period.split('-').map(Number);

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  return period;
}

function createPeriodData(data) {
  return data.map((item) => ({
    ...item,
    label: formatPeriod(item.period),
  }));
}

function ChartEmpty({ message }) {
  return (
    <div className='flex h-[280px] items-center justify-center px-6 text-center text-sm text-neutral-500'>
      {message}
    </div>
  );
}

function moneyTooltipFormatter(value, name) {
  return [formatInrFromPaise(Number(value)), name];
}

function integerTooltipFormatter(value, name) {
  return [integerFormatter.format(Number(value)), name];
}

export function RevenueTrendChart({ data }) {
  if (data.length === 0) {
    return (
      <ChartEmpty message='No revenue data is available for this range.' />
    );
  }

  const chartData = createPeriodData(data);

  return (
    <div
      role='img'
      aria-label='Revenue over time chart showing gross sales, net revenue, and Customer refunds'>
      <ResponsiveContainer width='100%' height={300}>
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 12,
            left: 8,
            bottom: 4,
          }}>
          <CartesianGrid
            stroke={CHART_GRID}
            strokeDasharray='3 3'
            vertical={false}
          />

          <XAxis
            dataKey='label'
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />

          <YAxis
            tick={AXIS_TICK}
            tickFormatter={formatCompactMoney}
            tickLine={false}
            axisLine={false}
            width={74}
          />

          <Tooltip formatter={moneyTooltipFormatter} />

          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Line
            type='monotone'
            dataKey='grossSales'
            name='Gross sales'
            stroke='#737373'
            strokeWidth={2}
            dot={false}
          />

          <Line
            type='monotone'
            dataKey='netRevenue'
            name='Net revenue'
            stroke='#171717'
            strokeWidth={2.5}
            dot={false}
          />

          <Line
            type='monotone'
            dataKey='refundedAmount'
            name='Customer refunds'
            stroke='#dc2626'
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrdersTrendChart({ data }) {
  if (data.length === 0) {
    return <ChartEmpty message='No Order trend data is available.' />;
  }

  const chartData = createPeriodData(data);

  return (
    <div role='img' aria-label='Orders placed over time chart'>
      <ResponsiveContainer width='100%' height={300}>
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 12,
            left: 0,
            bottom: 4,
          }}>
          <CartesianGrid
            stroke={CHART_GRID}
            strokeDasharray='3 3'
            vertical={false}
          />

          <XAxis
            dataKey='label'
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />

          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={40}
          />

          <Tooltip formatter={integerTooltipFormatter} />

          <Line
            type='monotone'
            dataKey='value'
            name='Orders'
            stroke='#171717'
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesBySportChart({ data }) {
  if (data.length === 0) {
    return (
      <ChartEmpty message='No recognized Sport sales exist for this range.' />
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: formatLabel(item.sport),
  }));

  return (
    <div role='img' aria-label='Sales amount by Sport chart'>
      <ResponsiveContainer width='100%' height={300}>
        <BarChart
          data={chartData}
          margin={{
            top: 10,
            right: 12,
            left: 8,
            bottom: 4,
          }}>
          <CartesianGrid
            stroke={CHART_GRID}
            strokeDasharray='3 3'
            vertical={false}
          />

          <XAxis
            dataKey='label'
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            tick={AXIS_TICK}
            tickFormatter={formatCompactMoney}
            tickLine={false}
            axisLine={false}
            width={74}
          />

          <Tooltip formatter={moneyTooltipFormatter} />

          {/* <Bar
            dataKey='salesAmount'
            name='Sales amount'
            fill='#171717'
            radius={[3, 3, 0, 0]}
          /> */}

          <Bar
            dataKey='salesAmount'
            name='Sales amount'
            fill='#171717'
            maxBarSize={72}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategorySalesChart({ data }) {
  if (data.length === 0) {
    return <ChartEmpty message='No Category sales exist for this range.' />;
  }

  const chartData = data.map((item) => ({
    ...item,
    label: item.categoryName,
  }));

  const height = Math.max(280, chartData.length * 42);

  return (
    <div role='img' aria-label='Sales amount by historical Category chart'>
      <ResponsiveContainer width='100%' height={height}>
        <BarChart
          layout='vertical'
          data={chartData}
          margin={{
            top: 10,
            right: 20,
            left: 10,
            bottom: 4,
          }}>
          <CartesianGrid
            stroke={CHART_GRID}
            strokeDasharray='3 3'
            horizontal={false}
          />

          <XAxis
            type='number'
            tick={AXIS_TICK}
            tickFormatter={formatCompactMoney}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            type='category'
            dataKey='label'
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={130}
          />

          <Tooltip formatter={moneyTooltipFormatter} />

          {/* <Bar
            dataKey='salesAmount'
            name='Sales amount'
            fill='#404040'
            radius={[0, 3, 3, 0]}
          /> */}

          <Bar
            dataKey='salesAmount'
            name='Sales amount'
            fill='#404040'
            maxBarSize={52}
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsChart({ data }) {
  if (data.length === 0) {
    return (
      <ChartEmpty message='No top-selling Products exist for this range.' />
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: item.productName,
  }));

  const height = Math.max(300, chartData.length * 44);

  return (
    <div role='img' aria-label='Top-selling Products by units sold chart'>
      <ResponsiveContainer width='100%' height={height}>
        <BarChart
          layout='vertical'
          data={chartData}
          margin={{
            top: 10,
            right: 20,
            left: 12,
            bottom: 4,
          }}>
          <CartesianGrid
            stroke={CHART_GRID}
            strokeDasharray='3 3'
            horizontal={false}
          />

          <XAxis
            type='number'
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            type='category'
            dataKey='label'
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={145}
          />

          <Tooltip formatter={integerTooltipFormatter} />

          {/* <Bar
            dataKey='unitsSold'
            name='Units sold'
            fill='#171717'
            radius={[0, 3, 3, 0]}
          /> */}

          <Bar
            dataKey='unitsSold'
            name='Units sold'
            fill='#171717'
            maxBarSize={42}
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderStatusChart({ data }) {
  if (data.length === 0) {
    return <ChartEmpty message='No Orders exist for this range.' />;
  }

  const chartData = data.map((item) => ({
    ...item,
    label: formatLabel(item.status),
  }));

  return (
    <div role='img' aria-label='Order status distribution chart'>
      <ResponsiveContainer width='100%' height={300}>
        <PieChart>
          <Tooltip formatter={integerTooltipFormatter} />

          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Pie
            data={chartData}
            dataKey='value'
            nameKey='label'
            innerRadius={58}
            outerRadius={92}
            paddingAngle={2}>
            {chartData.map((item) => (
              <Cell
                key={item.status}
                fill={STATUS_COLORS[item.status] ?? '#737373'}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NewCustomerTrendChart({ data }) {
  if (data.length === 0) {
    return <ChartEmpty message='No Customer trend data is available.' />;
  }

  const chartData = createPeriodData(data);

  return (
    <div role='img' aria-label='New Customer registrations over time chart'>
      <ResponsiveContainer width='100%' height={280}>
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 12,
            left: 0,
            bottom: 4,
          }}>
          <CartesianGrid
            stroke={CHART_GRID}
            strokeDasharray='3 3'
            vertical={false}
          />

          <XAxis
            dataKey='label'
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />

          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={40}
          />

          <Tooltip formatter={integerTooltipFormatter} />

          <Line
            type='monotone'
            dataKey='value'
            name='New Customers'
            stroke='#2563eb'
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RefundRequestTrendChart({ data }) {
  if (data.length === 0) {
    return <ChartEmpty message='No Refund trend data is available.' />;
  }

  const chartData = createPeriodData(data);

  return (
    <div role='img' aria-label='Customer Refund requests over time chart'>
      <ResponsiveContainer width='100%' height={260}>
        <BarChart
          data={chartData}
          margin={{
            top: 10,
            right: 12,
            left: 0,
            bottom: 4,
          }}>
          <CartesianGrid
            stroke={CHART_GRID}
            strokeDasharray='3 3'
            vertical={false}
          />

          <XAxis
            dataKey='label'
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />

          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={40}
          />

          <Tooltip formatter={integerTooltipFormatter} />

          <Bar
            dataKey='customerRequests'
            name='Customer requests'
            fill='#d97706'
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RefundAmountTrendChart({ data }) {
  if (data.length === 0) {
    return (
      <ChartEmpty message='No Refund financial trend data is available.' />
    );
  }

  const chartData = createPeriodData(data);

  return (
    <div
      role='img'
      aria-label='Provider-confirmed Refund amount over time chart'>
      <ResponsiveContainer width='100%' height={260}>
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 12,
            left: 8,
            bottom: 4,
          }}>
          <CartesianGrid
            stroke={CHART_GRID}
            strokeDasharray='3 3'
            vertical={false}
          />

          <XAxis
            dataKey='label'
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />

          <YAxis
            tick={AXIS_TICK}
            tickFormatter={formatCompactMoney}
            tickLine={false}
            axisLine={false}
            width={74}
          />

          <Tooltip formatter={moneyTooltipFormatter} />

          <Line
            type='monotone'
            dataKey='refundedAmount'
            name='Refunded amount'
            stroke='#dc2626'
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
