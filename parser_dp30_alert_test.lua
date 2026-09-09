local puerto = serial:find_serial(0)

local HEAD = 0xFE
local TAIL = 0xFF
local FRAME_LEN = 80

local buffer = {}
local frame_count = 0
local frames_bad = 0

-- Rendimiento
local MAX_BYTES_PER_UPDATE = 16
local PUBLICAR_CADA_N_FRAMES = 5

-- Alerta unica: H2 Pressure
local LOW_H2_PRESSURE = 353.0
local last_h2_alert_ms = 0
local last_error_alert_ms = 0
local last_error_alert_code = -1
local ALERT_INTERVAL_MS = 5000

local ERROR_MESSAGES = {
    [114] = "Stack 1 Voltage below 48 V",
    [214] = "Stack 2 Voltage below 48 V",
    [115] = "Stack Current 1 Over 30 Amps",
    [215] = "Stack Current 2 Over 30 Amps",
    [116] = "Temperature Cell 1 Over 55 degree",
    [216] = "Temperature Cell 2 Over 55 degree",
    [118] = "OCV Voltage Stack 1 Out Of range",
    [218] = "OCV Voltage Stack 2 Out Of range",
    [141] = "stack 1 high pressure at low pressure sensor",
    [241] = "stack 2 high pressure at low pressure sensor",
    [117] = "Cell 1 Fan Speed Below 25 percent",
    [217] = "Cell 2 Fan Speed Below 25 percent",
    [111] = "temperature 1 Cell 1 temperature out of Range",
    [112] = "temperature 2 Cell 1 temperature out of Range",
    [211] = "temperature 1 Cell 2 temperature out of Range",
    [212] = "temperature 2 Cell 2 temperature out of Range",
    [113] = "stack 1 voltage to power board voltage over 5 V",
    [213] = "stack 2 voltage to power board voltage over 5 V",
    [100] = "stack 1 C A N disconnect",
    [200] = "stack 2 C A N disconnect",
    [101] = "stack 1 pressure over 2 bar",
    [201] = "stack 2 pressure over 2 bar",
    [102] = "stack 1 pressure below 0.5 bar",
    [202] = "stack 2 pressure below 0.5 bar",
    [142] = "stack 1 pressure below 0.5 bar",
    [242] = "stack 2 pressure below 0.5 bar",
    [105] = "Stack 1 Voltage Below 10 V",
    [205] = "Stack 2 Voltage Below 10 V",
    [146] = "Stack 1 Anode Heating Pad Temperature Over 50 degree",
    [147] = "Stack 1 Cathode Heating Pad Temperature Over 50 degree",
    [148] = "Stack 1 Purge Heating Pad Temperature Over 50 degree",
    [246] = "Stack 2 Anode Heating Pad Temperature Over 50 degree",
    [247] = "Stack 2 Cathode Heating Pad Temperature Over 50 degree",
    [248] = "Stack 2 Purge Heating Pad Temperature Over 50 degree",
    [4] = "Output Voltage below 47 V",
    [8] = "Output Voltage below 45 V",
    [5] = "Battery Current Over 5 Amps Charge",
    [7] = "Battery Current Over 15 Amps Discharge",
    [3] = "Stack 1,2 Current Over 10Amps",
    [11] = "PowerPack Temperature Out of Range",
    [6] = "Battery Voltage Over 51.5 V",
    [2] = "Low Fuel Level, H2 Below 50Bar",
    [1] = "Extremely Low Fuel Level, H2 Below 20 Bar",
    [12] = "C A N Disconnected",
    [9] = "Output Voltage below 10 V",
    [20] = "Unsuitable Operating Outside Temp",
    [21] = "Outside Humidity Too Low",
}

local function u16be(bytes, i)
    return bytes[i] * 256 + bytes[i + 1]
end

local function div10(bytes, i)
    return u16be(bytes, i) / 10.0
end

local function div100(bytes, i)
    return u16be(bytes, i) / 100.0
end

local function div10_plain(bytes, i)
    return u16be(bytes, i) / 10.0
end

local function temp_from_u16(bytes, i)
    return (u16be(bytes, i) / 10.0) - 40.0
end

local function u8(bytes, i)
    return bytes[i]
end

local function parsear_trama(frame)
    return {
        -- Base/Powerpack
        h2 = div10(frame, 4),
        out_v = div100(frame, 6),
        out_i = div100(frame, 8),
        batt_v = div100(frame, 10),
        batt_i = div100(frame, 12) - 75.0,
        error_code = frame[15],
        inside_temp = temp_from_u16(frame, 20),
        pwr_out_tmp = temp_from_u16(frame, 16),
        
        -- Stack 1 / Fuel Cell 1
        fc1_volt = div10_plain(frame, 24),
        fc1_ntc_tmp = temp_from_u16(frame, 26),
        fc1_curr = div100(frame, 30),
        fc1_fan_sp = u16be(frame, 38),
        fc1_lh2p = div10_plain(frame, 50),
        
        -- Stack 2 / Fuel Cell 2
        fc2_volt = div10_plain(frame, 52),
        fc2_ntc_tmp = temp_from_u16(frame, 54),
        fc2_curr = div100(frame, 58),
        fc2_fan_sp = u16be(frame, 66),
        fc2_lh2p = div10_plain(frame, 78),
    }
end

local function publicar_quick(d)
    gcs:send_named_float("h2", d.h2)
    gcs:send_named_float("outvolt", d.out_v)
    gcs:send_named_float("batvolt", d.batt_v)
    gcs:send_named_float("outcurr", d.out_i)
    gcs:send_named_float("batcurr", d.batt_i)
    gcs:send_named_float("errcode", d.error_code)
    gcs:send_named_float("inttemp", d.inside_temp)
    gcs:send_named_float("pwr_out_t", d.pwr_out_tmp)
    
    -- Stack 1
    gcs:send_named_float("fc1_vlt", d.fc1_volt)
    gcs:send_named_float("fc1_ntc", d.fc1_ntc_tmp)
    gcs:send_named_float("fc1_cur", d.fc1_curr)
    gcs:send_named_float("fc1_fan", d.fc1_fan_sp)
    gcs:send_named_float("fc1_lh2", d.fc1_lh2p)
    
    -- Stack 2
    gcs:send_named_float("fc2_vlt", d.fc2_volt)
    gcs:send_named_float("fc2_ntc", d.fc2_ntc_tmp)
    gcs:send_named_float("fc2_cur", d.fc2_curr)
    gcs:send_named_float("fc2_fan", d.fc2_fan_sp)
    gcs:send_named_float("fc2_lh2", d.fc2_lh2p)
end

local function check_error_code_alert(d)
    local msg = ERROR_MESSAGES[d.error_code]
    local now = millis()

    if not msg then
        if d.error_code == 0 then
            last_error_alert_code = -1
        end
        return
    end

    if d.error_code ~= last_error_alert_code or now - last_error_alert_ms >= ALERT_INTERVAL_MS then
        gcs:send_text(1, msg)
        last_error_alert_ms = now
        last_error_alert_code = d.error_code
    end
end

local function procesar_byte(b)
    if b == nil or b < 0 then
        return nil
    end

    if #buffer == 0 then
        if b == HEAD then
            buffer[1] = b
        end
        return nil
    end

    buffer[#buffer + 1] = b

    if #buffer == FRAME_LEN then
        local frame = buffer
        buffer = {}

        if frame[FRAME_LEN] ~= TAIL then
            frames_bad = frames_bad + 1
            return nil
        end

        frame_count = frame_count + 1
        return parsear_trama(frame)
    end

    if #buffer > FRAME_LEN then
        buffer = {}
        frames_bad = frames_bad + 1
    end

    return nil
end

function update()
    if not puerto then
        gcs:send_text(0, "DP30: NO SERIAL PORT")
        return update, 2000
    end

    local disponibles = puerto:available()
    local procesados = 0

    while disponibles > 0 and procesados < MAX_BYTES_PER_UPDATE do
        local byte = puerto:read()
        local datos = procesar_byte(byte)

        if datos then
            if (frame_count % PUBLICAR_CADA_N_FRAMES) == 0 then
                publicar_quick(datos)
                check_error_code_alert(datos)
            end
        end

        disponibles = disponibles - 1
        procesados = procesados + 1
    end

    return update, 50
end

gcs:send_text(6, "DP30 parser started on SERIAL3")
puerto:begin(115200)
puerto:set_flow_control(0)
return update, 1000
