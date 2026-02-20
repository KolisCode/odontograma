import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-tooth',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tooth.html',
  styleUrl: './tooth.css',
})
export class Tooth {
  // Número FDI del diente
  @Input() number!: number;

  // Indica si está seleccionado
  @Input() selected: boolean = false;

  @Input() filledFaces: { face: string; type: string }[] = [];

  // Evento que se emite al hacer click
  @Output() toothClick = new EventEmitter<number>();

  onClick(): void {
    this.toothClick.emit(this.number);
  }
  getFaceClass(face: string): string {
  console.log('Evaluando cara:', face, this.filledFaces);

  const match = this.filledFaces.find((f) => f.face === face);
  return match ? this.getDiagnosisClass(match.type) : '';
}


  onToothClick() {
    this.toothClick.emit(this.number);
  }

  getDiagnosisClass(type: string): string {
    switch (type) {
      case 'Caries':
        return 'caries';
      case 'Obturación':
        return 'obturacion';
      case 'Fractura':
        return 'fractura';
      case 'Sellante':
        return 'sellante';
      default:
        return '';
    }
  }
}
