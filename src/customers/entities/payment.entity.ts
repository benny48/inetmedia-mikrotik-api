import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

const moneyTransformer = {
  to: (v?: number) => v,
  from: (v: any) =>
    v === null || v === undefined
      ? v
      : typeof v === 'number'
        ? v
        : parseFloat(v),
};

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, (c) => c.payments, { onDelete: 'CASCADE' })
  customer: Customer;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: moneyTransformer,
  })
  amount: number; // nilai yang dibayar

  // default: lunas (sesuai kebutuhan "line history pembayaran yang sudah lunas")
  @Index()
  @Column({ default: true })
  paid: boolean;

  // payment.entity.ts
  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null; // ⬅️ bukan paidAt?

  // opsional metadata
  @Column({ length: 120, nullable: true })
  method?: string; // cash, transfer, qris, dll

  @Column({ length: 180, nullable: true })
  reference?: string; // no. referensi/VA/nomor bukti

  @Column({ type: 'text', nullable: true })
  description?: string; // catatan

  // opsional periode tagihan
  @Column({ type: 'int', nullable: true })
  periodMonth?: number; // 1..12

  @Column({ type: 'int', nullable: true })
  periodYear?: number; // 2025, dll

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
