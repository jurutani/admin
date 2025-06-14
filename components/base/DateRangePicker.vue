<script setup lang="ts">
import type { DateRange } from 'radix-vue'
import type { Ref } from 'vue'
import { cn } from '@/lib/utils'

import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date';
import { Calendar as CalendarIcon, X } from 'lucide-vue-next';

// Props
interface Props {
  placeholder?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Pilih rentang tanggal',
  class: ''
})

// Emits
const emit = defineEmits<{
  'update:date-range': [value: DateRange | null]
}>()

// Date formatter
const df = new DateFormatter('id-ID', {
  dateStyle: 'medium',
})

// Initial value - default to last 30 days
const todayDate = today(getLocalTimeZone())
const defaultStartDate = todayDate.subtract({ days: 30 })
const defaultEndDate = todayDate

const value = ref<DateRange | null>({
  start: defaultStartDate,
  end: defaultEndDate,
}) as Ref<DateRange | null>

// Watch for value changes and emit to parent
watch(value, (newValue) => {
  emit('update:date-range', newValue)
}, { immediate: true })

// Methods
function clearDateRange() {
  value.value = null
  emit('update:date-range', null)
}

function setPresetRange(days: number) {
  const endDate = today(getLocalTimeZone())
  const startDate = endDate.subtract({ days })
  
  value.value = {
    start: startDate,
    end: endDate
  }
}

// Computed
const displayText = computed(() => {
  if (!value.value?.start) return props.placeholder
  
  if (value.value.end) {
    return `${df.format(value.value.start.toDate(getLocalTimeZone()))} - ${df.format(value.value.end.toDate(getLocalTimeZone()))}`
  }
  
  return df.format(value.value.start.toDate(getLocalTimeZone()))
})

const hasValue = computed(() => value.value?.start !== undefined)
</script>

<template>
  <div :class="cn('grid gap-2', props.class)">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          id="date"
          variant="outline"
          :class="cn(
            'justify-start text-left font-normal w-[280px]',
            !hasValue && 'text-muted-foreground',
          )"
        >
          <CalendarIcon class="mr-2 h-4 w-4" />
          {{ displayText }}
          <X 
            v-if="hasValue"
            class="ml-auto h-4 w-4 hover:bg-muted rounded-sm p-0.5"
            @click.stop="clearDateRange"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="end">
        <div class="flex">
          <!-- Preset buttons -->
          <div class="flex flex-col gap-2 p-3 border-r">
            <p class="text-sm font-medium">Preset</p>
            <Button
              variant="ghost"
              size="sm"
              class="justify-start text-left h-auto p-2"
              @click="setPresetRange(7)"
            >
              7 hari terakhir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="justify-start text-left h-auto p-2"
              @click="setPresetRange(30)"
            >
              30 hari terakhir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="justify-start text-left h-auto p-2"
              @click="setPresetRange(90)"
            >
              90 hari terakhir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="justify-start text-left h-auto p-2"
              @click="setPresetRange(365)"
            >
              1 tahun terakhir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="justify-start text-left h-auto p-2 text-muted-foreground"
              @click="clearDateRange"
            >
              Hapus filter
            </Button>
          </div>
          
          <!-- Calendar -->
          <div class="p-3">
            <RangeCalendar
              v-model="value"
              weekday-format="short"
              :number-of-months="2"
              initial-focus
              :placeholder="value?.start || todayDate"
              locale="id-ID"
              @update:start-value="(startDate: any) => {
                if (value) {
                  value.start = startDate
                } else {
                  value = { start: startDate, end: startDate }
                }
              }"
              @update:end-value="(endDate: any) => {
                if (value) {
                  value.end = endDate
                }
              }"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>